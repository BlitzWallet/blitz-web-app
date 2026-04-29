import React, { useCallback, useState, useMemo } from "react";

import { useNavigate } from "react-router-dom";

// import { sendPushNotification } from "../../../../../functions/messaging/publishMessage";

import { useTranslation } from "react-i18next";

import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import useThemeColors from "../../../../hooks/useThemeColors";
import ThemeText from "../../../../components/themeText/themeText";
import { getDataFromCollection, updateMessage } from "../../../../../db";
import { useThemeContext } from "../../../../contexts/themeContext";
import { useKeysContext } from "../../../../contexts/keysContext";
import CustomButton from "../../../../components/customButton/customButton";
import { useServerTimeOnly } from "../../../../contexts/serverTime";
import GiftCardTxItem from "../giftCardTxItem/giftCardTxItem";
import { getTimeDisplay } from "../../../../functions/contacts";
import getReceiveAddressAndContactForContactsPayment from "../../utils/getReceiveAddressAndKindForPayment";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { getTransactionContent } from "../../utils/transactionText";
import displayCorrectDenomination from "../../../../functions/displayCorrectDenomination";
import { useNodeContext } from "../../../../contexts/nodeContext";

import "./contactsTransactionItem.css";
import { ArrowDown, ArrowUp, CircleX } from "lucide-react";
import { Colors } from "../../../../constants/theme";
import {
  handlePaymentUpdate,
  sendPushNotification,
} from "../../../../functions/messaging/publishMessage";
import { useOverlay } from "../../../../contexts/overlayContext";
import ThemeIcon from "../../../../components/themeIcon";
import formatBalanceAmount from "../../../../functions/formatNumber";

function ConfirmedOrSentTransaction({
  txParsed,
  paymentDescription,
  timeDifferenceMinutes,
  timeDifferenceHours,
  timeDifferenceDays,
  timeDifferenceYears,
  navigate,
  isPendingRequest,
}) {
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { textColor, backgroundOffset } = useThemeColors();

  const didDeclinePayment = txParsed.isRedeemed != null && !txParsed.isRedeemed;

  const isOutgoingPayment = useMemo(
    () =>
      (txParsed.didSend && !txParsed.isRequest) ||
      (txParsed.isRequest && txParsed.isRedeemed && !txParsed.didSend),
    [txParsed.didSend, txParsed.isRequest, txParsed.isRedeemed],
  );

  const timeDisplay = useMemo(
    () =>
      getTimeDisplay(
        timeDifferenceMinutes,
        timeDifferenceHours,
        timeDifferenceDays,
        timeDifferenceYears,
      ),
    [
      timeDifferenceMinutes,
      timeDifferenceHours,
      timeDifferenceDays,
      timeDifferenceYears,
    ],
  );

  const transactionContent = useMemo(
    () =>
      getTransactionContent({
        paymentDescription,
        didDeclinePayment,
        txParsed,
        t,
      }),
    [paymentDescription, didDeclinePayment, txParsed, t],
  );

  const textColorValue = useMemo(
    () =>
      didDeclinePayment
        ? theme && darkModeType
          ? textColor
          : Colors.constants.cancelRed
        : textColor,
    [didDeclinePayment, theme, darkModeType, textColor],
  );

  const balanceValue = useMemo(
    () =>
      txParsed?.paymentDenomination === "USD"
        ? parseFloat(txParsed.amountDollars || 0)
        : txParsed.amountMsat / 1000,
    [
      txParsed?.paymentDenomination,
      txParsed?.amountDollars,
      txParsed?.amountMsat,
      masterInfoObject,
    ],
  );

  if (txParsed.giftCardInfo) {
    return (
      <GiftCardTxItem
        txParsed={txParsed}
        isOutgoingPayment={isOutgoingPayment}
        theme={theme}
        darkModeType={darkModeType}
        backgroundOffset={backgroundOffset}
        timeDifference={timeDisplay}
        isFromProfile={false}
        t={t}
        navigate={navigate}
        masterInfoObject={masterInfoObject}
      />
    );
  }

  return (
    <div className="transaction-container centered">
      <ThemeIcon
        colorOverride={
          didDeclinePayment
            ? theme && darkModeType
              ? Colors.dark.text
              : Colors.constants.cancelRed
            : undefined
        }
        iconName={
          didDeclinePayment
            ? "CircleX"
            : isPendingRequest
              ? "Clock"
              : isOutgoingPayment
                ? "ArrowUp"
                : "ArrowDown"
        }
      />
      <div className="transaction-content">
        <ThemeText
          CustomEllipsizeMode={"tail"}
          CustomNumberOfLines={1}
          textStyles={{
            color: textColorValue,
            marginRight: 15,
          }}
          textContent={transactionContent}
        />
        <ThemeText
          textStyles={{
            color: textColorValue,
          }}
          className={"time-label"}
          textContent={timeDisplay}
        />
      </div>

      <FormattedSatText
        frontText={
          didDeclinePayment ||
          masterInfoObject.userBalanceDenomination === "hidden"
            ? ""
            : isOutgoingPayment
              ? "-"
              : "+"
        }
        containerStyles={{
          marginBottom: "auto",
        }}
        styles={{
          fontWeight: 400,
          color: textColorValue,
          marginTop: 0,
          marginBottom: 0,
        }}
        balance={balanceValue}
        useMillionDenomination={true}
        useBalance={txParsed?.paymentDenomination === "USD"}
        useCustomLabel={txParsed?.paymentDenomination === "USD"}
        customLabel={txParsed?.paymentDenomination === "USD" ? "USDB" : null}
      />
    </div>
  );
}

ConfirmedOrSentTransaction.displayName = "ConfirmedOrSentTransaction";

export default function ContactsTransactionItem(props) {
  const { selectedContact, transaction, myProfile, currentTime, imageData } =
    props;
  const { openOverlay } = useOverlay();
  const { t } = useTranslation();
  const { fiatStats } = useNodeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundColor } = useThemeColors();
  const navigate = useNavigate();
  const getServerTime = useServerTimeOnly();
  const { globalContactsInformation } = useGlobalContacts();
  const [isLoading, setIsLoading] = useState({
    sendBTN: false,
    declineBTN: false,
  });

  // Memoized calculations
  const timeCalculations = useMemo(() => {
    const timeDifferenceMs = Math.abs(currentTime - transaction.timestamp);

    return {
      timeDifferenceMinutes: timeDifferenceMs / (1000 * 60),
      timeDifferenceHours: timeDifferenceMs / (1000 * 60 * 60),
      timeDifferenceDays: timeDifferenceMs / (1000 * 60 * 60 * 24),
      timeDifferenceYears: timeDifferenceMs / (1000 * 60 * 60 * 24 * 365),
    };
  }, [currentTime, transaction.timestamp]);

  const txParsed = transaction.message;
  const paymentDescription = txParsed?.description || "";

  const isCompletedTransaction = useMemo(
    () =>
      txParsed?.didSend ||
      !txParsed?.isRequest ||
      (txParsed?.isRequest && txParsed.isRedeemed != null),
    [txParsed?.didSend, txParsed?.isRequest, txParsed?.isRedeemed],
  );

  const isPendingRequest = txParsed?.isRequest && txParsed.isRedeemed === null;

  const requestAmount = useMemo(() => {
    if (txParsed?.paymentDenomination === "USD") {
      return displayCorrectDenomination({
        amount: formatBalanceAmount(
          txParsed?.amountDollars,
          false,
          masterInfoObject,
        ),
        masterInfoObject: {
          ...masterInfoObject,
          userBalanceDenomination: "fiat",
        },
        fiatStats,
        forceCurrency: "USD",
        convertAmount: false,
      });
    } else {
      return displayCorrectDenomination({
        amount: txParsed?.amountMsat / 1000,
        masterInfoObject,
        fiatStats,
        useMillionDenomination: true,
      });
    }
  }, [txParsed?.amountMsat, masterInfoObject, fiatStats]);

  const timeDisplay = useMemo(
    () =>
      getTimeDisplay(
        timeCalculations.timeDifferenceMinutes,
        timeCalculations.timeDifferenceHours,
        timeCalculations.timeDifferenceDays,
        timeCalculations.timeDifferenceYears,
      ),
    [timeCalculations],
  );

  const updatePaymentStatus = useCallback(
    async (transaction, usingOnPage, didPay, txid) => {
      try {
        if (usingOnPage) {
          setIsLoading((prev) => ({
            ...prev,
            [didPay ? "sendBTN" : "declineBTN"]: true,
          }));
        }

        const newMessage = {
          ...transaction.message,
          isRedeemed: didPay,
          txid,
          name:
            globalContactsInformation.myProfile.name ||
            globalContactsInformation.myProfile.uniqueName,
        };

        if (newMessage.senderProfileSnapshot) {
          newMessage.senderProfileSnapshot.uniqueName =
            globalContactsInformation.myProfile.uniqueName;
        }
        delete newMessage.didSend;
        delete newMessage.wasSeen;

        const retrivedContact = await getDataFromCollection(
          "blitzWalletUsers",
          selectedContact.uuid,
        );

        if (!retrivedContact) {
          throw new Error(t("errormessages.userDataFetchError"));
        }

        const currentTime = getServerTime();

        const useNewNotifications = !!retrivedContact.isUsingNewNotifications;

        const notificationData = {
          isUpdate: true,
          [useNewNotifications ? "option" : "message"]: useNewNotifications
            ? didPay
              ? "paid"
              : "declined"
            : t(
                "contacts.internalComponents.contactsTransactions.pushNotificationUpdateMessage",
                {
                  name: myProfile.name || myProfile.uniqueName,
                  option: didPay
                    ? t("transactionLabelText.paidLower")
                    : t("transactionLabelText.declinedLower"),
                },
              ),
        };

        const updateMessageParams = retrivedContact.isUsingEncriptedMessaging
          ? {
              newMessage,
              fromPubKey: publicKey,
              toPubKey: selectedContact.uuid,
              retrivedContact,
              privateKey: contactsPrivateKey,
              currentTime,
            }
          : {
              newMessage,
              fromPubKey: transaction.fromPubKey,
              toPubKey: transaction.toPubKey,
              retrivedContact,
              privateKey: contactsPrivateKey,
              currentTime,
            };

        const [didPublishNotification, didUpdateMessage] = await Promise.all([
          sendPushNotification({
            selectedContactUsername: selectedContact.uniqueName,
            myProfile,
            data: notificationData,
            privateKey: contactsPrivateKey,
            retrivedContact,
            masterInfoObject,
          }),
          updateMessage(updateMessageParams),
        ]);

        if (!didUpdateMessage && usingOnPage) {
          navigate.navigate("ErrorScreen", {
            errorMessage: t("errormessages.updateContactMessageError"),
          });
        }
      } catch (err) {
        console.log(err);
        if (usingOnPage) {
          openOverlay({
            for: "error",
            errorMessage: t("errormessages.declinePaymentError"),
          });
        }
      } finally {
        if (usingOnPage) {
          setIsLoading((prev) => ({
            ...prev,
            [didPay ? "sendBTN" : "declineBTN"]: false,
          }));
        }
      }
    },
    [
      selectedContact,
      myProfile,
      contactsPrivateKey,
      publicKey,
      getServerTime,
      navigate,
      masterInfoObject,
      globalContactsInformation,
      t,
    ],
  );

  const acceptPayRequest = useCallback(
    async (transaction, selectedContact) => {
      setIsLoading((prev) => ({
        ...prev,
        sendBTN: true,
      }));
      const sendingAmount = transaction.message.amountMsat / 1000;

      const myProfileMessage = t(
        "contacts.internalComponents.contactsTransactions.acceptProfileMessage",
        {
          name: selectedContact.name || selectedContact.uniqueName,
        },
      );
      const payingContactMessage = t(
        "contacts.internalComponents.contactsTransactions.acceptPayingContactMessage",
        {
          name:
            globalContactsInformation.myProfile.name ||
            globalContactsInformation.myProfile.uniqueName,
        },
      );

      const {
        receiveAddress,
        didWork,
        error,
        formattedPayingContactMessage,
        retrivedContact,
      } = await getReceiveAddressAndContactForContactsPayment({
        sendingAmountSat: sendingAmount,
        selectedContact,
        myProfileMessage,
        payingContactMessage,
      });

      if (!didWork) {
        openOverlay({
          for: "error",
          errorMessage: t(error),
        });
        return;
      }

      setIsLoading((prev) => ({
        ...prev,
        sendBTN: false,
      }));

      const currentTime = getServerTime();
      navigate("/send", {
        state: {
          btcAddress: receiveAddress,
          comingFromAccept: true,
          enteredPaymentInfo: {
            fromContacts: true,
            payingContactsRequest: true,
            amount: sendingAmount,
            description: myProfileMessage,
            inputCurrency: transaction.message.paymentDenomination || "BTC",
            endReceiveType: transaction.message.paymentDenomination || "BTC",
          },
          contactInfo: {
            imageData,
            name: selectedContact.name || selectedContact.uniqueName,
            payingContactMessage: formattedPayingContactMessage, //handles remote tx description
            uniqueName: retrivedContact?.contacts?.myProfile?.uniqueName,
            uuid: retrivedContact?.uuid,
          },
          fromPage: "contacts-request",
          publishMessageFuncParams: {
            transaction,
            didPay: true,
            globalContactsInformation,
            selectedContact,
            currentTime,
          },
        },
      });
      return;
    },
    [
      myProfile,
      navigate,
      updatePaymentStatus,
      globalContactsInformation,
      imageData,
      selectedContact,
      getServerTime,
    ],
  );

  const handleDescriptionClick = () => {
    if (!paymentDescription) return;
    navigate("/modal", {
      state: {
        wantedContent: "expandedContactMessage",
        sliderHeight: 0.3,
        message: paymentDescription,
      },
    });
  };

  if (!txParsed) return null;

  return (
    <div className="transaction-item-button" key={props.id}>
      {isCompletedTransaction ? (
        <ConfirmedOrSentTransaction
          txParsed={txParsed}
          paymentDescription={paymentDescription}
          {...timeCalculations}
          navigate={navigate}
          masterInfoObject={masterInfoObject}
          isPendingRequest={isPendingRequest}
        />
      ) : (
        <div className="transaction-container">
          <ThemeIcon iconName={isPendingRequest ? "Clock" : "ArrowDown"} />

          <div className="transaction-content">
            <ThemeText
              textContent={t(
                "contacts.internalComponents.contactsTransactions.requestTitle",
                {
                  amount: requestAmount,
                },
              )}
            />
            <ThemeText
              textStyles={{
                fontWeight: 300,
                marginBottom: paymentDescription ? 0 : 15,
              }}
              className={"time-label"}
              textContent={timeDisplay}
            />

            {paymentDescription && (
              <ThemeText
                CustomEllipsizeMode={"tail"}
                CustomNumberOfLines={2}
                textStyles={{
                  fontWeight: 400,
                  marginBottom: 10,
                }}
                textContent={paymentDescription}
              />
            )}

            <CustomButton
              useLoading={isLoading.sendBTN}
              loadingColor={backgroundColor}
              actionFunction={() => {
                acceptPayRequest(transaction, props.selectedContact);
              }}
              buttonStyles={{
                width: "100%",
                maxWidth: "unset",
                overflow: "hidden",
                borderRadius: 15,
                alignItems: "center",
                marginBottom: 10,
                backgroundColor: theme ? textColor : Colors.constants.blue,
              }}
              textStyles={{
                color: backgroundColor,
                opacity: 1,
              }}
              textContent={t(
                "contacts.internalComponents.contactsTransactions.send",
              )}
            />

            <CustomButton
              useLoading={isLoading.declineBTN}
              loadingColor={theme ? textColor : Colors.constants.blue}
              actionFunction={() => {
                updatePaymentStatus(transaction, true, false);
              }}
              buttonStyles={{
                width: "100%",
                maxWidth: "unset",
                overflow: "hidden",
                borderRadius: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme ? textColor : Colors.constants.blue,
                backgroundColor: "transparent",
              }}
              textStyles={{
                color: theme ? textColor : Colors.constants.blue,
              }}
              textContent={t("constants.decline")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
