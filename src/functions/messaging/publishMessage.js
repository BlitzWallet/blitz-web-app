import formatBalanceAmount from "../formatNumber";
import { getDataFromCollection, updateMessage } from "../../../db";
import { BITCOIN_SAT_TEXT, SATSPERBITCOIN } from "../../constants";
import fetchBackend from "../../../db/handleBackend";
import loadNewFiatData from "../saveAndUpdateFiatData";
import i18next from "i18next";

export async function publishMessage({
  toPubKey,
  fromPubKey,
  data,
  globalContactsInformation,
  selectedContact,
  isLNURLPayment,
  privateKey,
  retrivedContact,
  currentTime,
  masterInfoObject,
}) {
  try {
    const sendingObj = data;
    await updateMessage({
      newMessage: sendingObj,
      fromPubKey,
      toPubKey,
      onlySaveToLocal: isLNURLPayment,
      retrivedContact,
      privateKey,
      currentTime,
    });

    if (isLNURLPayment) return;
    sendPushNotification({
      selectedContactUsername: selectedContact.uniqueName,
      myProfile: globalContactsInformation.myProfile,
      data: data,
      privateKey,
      retrivedContact,
      masterInfoObject,
    });
  } catch (err) {
    console.log(err), "pubishing message to server error";
  }
}

export async function sendPushNotification({
  selectedContactUsername,
  myProfile,
  data,
  privateKey,
  retrivedContact,
  masterInfoObject,
}) {
  try {
    console.log(selectedContactUsername);

    // Check if there is a selected contact
    if (!retrivedContact) return;
    const pushNotificationData = retrivedContact.pushNotifications;

    // check if the person has a push token saved
    if (!pushNotificationData?.key?.encriptedText) return;

    // If a user has updated thier settings and they have chosen to not receive notification for contact payments
    if (
      pushNotificationData?.enabledServices?.contactPayments !== undefined &&
      !pushNotificationData?.enabledServices?.contactPayments
    )
      return;

    const useNewNotifications = !!retrivedContact.isUsingNewNotifications;
    const devicePushKey =
      retrivedContact?.pushNotifications?.key?.encriptedText;
    const deviceType = retrivedContact?.pushNotifications?.platform;
    const sendingContactFiatCurrency = retrivedContact?.fiatCurrency || "USD";
    const sendingContactDenominationType =
      retrivedContact?.userBalanceDenomination || "sats";

    if (!devicePushKey || !deviceType) return;

    let requestData = {};

    if (useNewNotifications) {
      let notificationData = {
        name: myProfile.name || myProfile.uniqueName,
      };

      if (data.isUpdate) {
        notificationData["option"] =
          data.option === "paid" ? "paidLower" : "declinedLower";
        notificationData["type"] = "updateMessage";
      } else if (data.isRequest) {
        notificationData["amountSat"] = data.amountMsat / 1000;
        notificationData["type"] = "request";
      } else if (data.giftCardInfo) {
        notificationData["giftCardName"] = data.giftCardInfo.name;
        notificationData["type"] = "giftCard";
      } else {
        notificationData["amountSat"] = data.amountMsat / 1000;
        notificationData["type"] = "payment";
      }

      requestData = {
        devicePushKey: devicePushKey,
        deviceType: deviceType,
        notificationData,
        decryptPubKey: retrivedContact.uuid,
      };
    } else if (data.giftCardInfo) {
      const message = `${myProfile.name || myProfile.uniqueName} sent you a ${
        data.giftCardInfo.name
      } Gift Card.`;
      requestData = {
        devicePushKey: devicePushKey,
        deviceType: deviceType,
        message,
        decryptPubKey: retrivedContact.uuid,
      };
    } else {
      const fiatValue = await loadNewFiatData(
        sendingContactFiatCurrency,
        privateKey,
        myProfile.uuid,
        masterInfoObject
      );
      const didFindCurrency = fiatValue?.didWork;
      const fiatAmount =
        didFindCurrency &&
        (
          (fiatValue?.value / SATSPERBITCOIN) *
          (data.amountMsat / 1000)
        ).toFixed(2);

      let message = "";
      if (data.isUpdate) {
        message = data.message;
      } else if (data.isRequest) {
        message = `${
          myProfile.name || myProfile.uniqueName
        } requested you ${formatBalanceAmount(
          sendingContactDenominationType != "fiat" || !fiatAmount
            ? data.amountMsat / 1000
            : fiatAmount,
          undefined,
          { thousandsSeperator: "space" }
        )} ${
          sendingContactDenominationType != "fiat" || !fiatAmount
            ? BITCOIN_SAT_TEXT
            : sendingContactFiatCurrency
        }`;
      } else {
        message = `${
          myProfile.name || myProfile.uniqueName
        } paid you ${formatBalanceAmount(
          sendingContactDenominationType != "fiat" || !fiatAmount
            ? data.amountMsat / 1000
            : fiatAmount,
          undefined,
          { thousandsSeperator: "space" }
        )} ${
          sendingContactDenominationType != "fiat" || !fiatAmount
            ? BITCOIN_SAT_TEXT
            : sendingContactFiatCurrency
        }`;
      }
      requestData = {
        devicePushKey: devicePushKey,
        deviceType: deviceType,
        message,
        decryptPubKey: retrivedContact.uuid,
      };
    }

    const response = await fetchBackend(
      `contactsPushNotificationV${useNewNotifications ? "4" : "3"}`,
      requestData,
      privateKey,
      myProfile.uuid
    );
    console.log(response, "contacts push notification response");
    return true;
  } catch (err) {
    console.log("publish message error", err);
    return false;
  }
}

export async function handlePaymentUpdate({
  transaction,
  didPay,
  txid,
  globalContactsInformation,
  selectedContact,
  currentTime,
  contactsPrivateKey,
  publicKey,
  masterInfoObject,
}) {
  try {
    let newMessage = {
      ...transaction.message,
      isRedeemed: didPay,
      txid,
      name:
        globalContactsInformation.myProfile.name ||
        globalContactsInformation.myProfile.uniqueName,
    };

    // Need to switch unique name since the original receiver is now the sender
    if (newMessage.senderProfileSnapshot) {
      newMessage.senderProfileSnapshot.uniqueName =
        globalContactsInformation.myProfile.uniqueName;
    }

    delete newMessage.didSend;
    delete newMessage.wasSeen;

    const [retrivedContact] = await Promise.all([
      getDataFromCollection("blitzWalletUsers", selectedContact.uuid),
    ]);
    if (!retrivedContact)
      throw new Error(i18next.t("errormessages.userDataFetchError"));

    const useNewNotifications = !!retrivedContact.isUsingNewNotifications;

    const [didPublishNotification, didUpdateMessage] = await Promise.all([
      sendPushNotification({
        selectedContactUsername: selectedContact.uniqueName,
        myProfile: globalContactsInformation.myProfile,
        data: {
          isUpdate: true,
          [useNewNotifications ? "option" : "message"]: useNewNotifications
            ? didPay
              ? "paid"
              : "declined"
            : t(
                "contacts.internalComponents.contactsTransactions.pushNotificationUpdateMessage",
                {
                  name:
                    globalContactsInformation.myProfile.name ||
                    globalContactsInformation.myProfile.uniqueName,
                  option: didPay
                    ? t("transactionLabelText.paidLower")
                    : t("transactionLabelText.declinedLower"),
                }
              ),
        },
        privateKey: contactsPrivateKey,
        retrivedContact,
        masterInfoObject,
      }),

      retrivedContact.isUsingEncriptedMessaging
        ? updateMessage({
            newMessage,
            fromPubKey: publicKey,
            toPubKey: selectedContact.uuid,
            retrivedContact,
            privateKey: contactsPrivateKey,
            currentTime,
          })
        : updateMessage({
            newMessage,
            fromPubKey: transaction.fromPubKey,
            toPubKey: transaction.toPubKey,
            retrivedContact,
            privateKey: contactsPrivateKey,
            currentTime,
          }),
    ]);
  } catch (err) {
    console.log("erro hanldling payment update", err.message);
    return false;
  }
}
