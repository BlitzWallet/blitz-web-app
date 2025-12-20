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

function ConfirmedOrSentTransaction({
  txParsed,
  paymentDescription,
  timeDifferenceMinutes,
  timeDifferenceHours,
  timeDifferenceDays,
  timeDifferenceYears,
  props,
  navigate,
}) {
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { textColor, backgroundOffset } = useThemeColors();

  const didDeclinePayment = txParsed.isRedeemed != null && !txParsed.isRedeemed;

  const isOutgoingPayment =
    (txParsed.didSend && !txParsed.isRequest) ||
    (txParsed.isRequest && txParsed.isRedeemed && !txParsed.didSend);

  if (txParsed.giftCardInfo) {
    return (
      <GiftCardTxItem
        txParsed={txParsed}
        isOutgoingPayment={isOutgoingPayment}
        theme={theme}
        darkModeType={darkModeType}
        backgroundOffset={backgroundOffset}
        timeDifference={getTimeDisplay(
          timeDifferenceMinutes,
          timeDifferenceHours,
          timeDifferenceDays,
          timeDifferenceYears
        )}
        isFromProfile={false}
        t={t}
        navigate={navigate}
        masterInfoObject={masterInfoObject}
      />
    );
  }

  return (
    <div className="transaction-container centered">
      {didDeclinePayment ? (
        <CircleX
          color={
            theme && darkModeType
              ? Colors.dark.text
              : Colors.constants.cancelRed
          }
        />
      ) : isOutgoingPayment ? (
        <ArrowUp
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      ) : (
        <ArrowDown
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      )}

      <div className="transaction-content">
        <ThemeText
          CustomEllipsizeMode={"tail"}
          CustomNumberOfLines={1}
          textStyles={{
            color: didDeclinePayment
              ? theme && darkModeType
                ? textColor
                : Colors.constants.cancelRed
              : textColor,
            marginRight: 15,
          }}
          textContent={getTransactionContent({
            paymentDescription,
            didDeclinePayment,
            txParsed,
            t,
          })}
        />
        <ThemeText
          textStyles={{
            color: didDeclinePayment
              ? theme && darkModeType
                ? textColor
                : Colors.constants.cancelRed
              : textColor,
          }}
          className={"time-label"}
          textContent={getTimeDisplay(
            timeDifferenceMinutes,
            timeDifferenceHours,
            timeDifferenceDays,
            timeDifferenceYears
          )}
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
          color: didDeclinePayment
            ? theme && darkModeType
              ? textColor
              : Colors.constants.cancelRed
            : textColor,
        }}
        balance={txParsed.amountMsat / 1000}
        useMillionDenomination={true}
      />
    </div>
  );
}

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
    const endDate = currentTime;
    const startDate = transaction.timestamp;

    const timeDifferenceMs = Math.abs(endDate - startDate);

    return {
      timeDifferenceMinutes: timeDifferenceMs / (1000 * 60),
      timeDifferenceHours: timeDifferenceMs / (1000 * 60 * 60),
      timeDifferenceDays: timeDifferenceMs / (1000 * 60 * 60 * 24),
      timeDifferenceYears: timeDifferenceMs / (1000 * 60 * 60 * 24 * 365),
    };
  }, [currentTime, transaction.serverTimestamp, transaction.timestamp]);

  const {
    timeDifferenceMinutes,
    timeDifferenceHours,
    timeDifferenceDays,
    timeDifferenceYears,
  } = timeCalculations;

  const txParsed = transaction.message;
  const paymentDescription = txParsed?.description || "";

  const updatePaymentStatus = useCallback(
    async (transaction, usingOnPage, didPay, txid) => {
      try {
        usingOnPage &&
          setIsLoading((prev) => ({
            ...prev,
            [didPay ? "sendBTN" : "declineBTN"]: true,
          }));
        const currentTime = getServerTime();
        const response = await handlePaymentUpdate({
          transaction,
          didPay,
          txid,
          globalContactsInformation,
          selectedContact,
          currentTime,
          contactsPrivateKey,
          publicKey,
          masterInfoObject,
        });

        if (!response && usingOnPage) {
          openOverlay({
            for: "error",
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
    ]
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
        }
      );
      const payingContactMessage = t(
        "contacts.internalComponents.contactsTransactions.acceptPayingContactMessage",
        {
          name:
            globalContactsInformation.myProfile.name ||
            globalContactsInformation.myProfile.uniqueName,
        }
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
            amount: sendingAmount,
            description: myProfileMessage,
          },
          contactInfo: {
            imageData,
            name: selectedContact.name || selectedContact.uniqueName,
            payingContactMessage: formattedPayingContactMessage,
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
    ]
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

  if (txParsed === undefined) return null;

  const isCompletedTransaction =
    txParsed.didSend ||
    !txParsed.isRequest ||
    (txParsed.isRequest && txParsed.isRedeemed != null);

  return (
    <div className="transaction-item-button" key={props.id}>
      {isCompletedTransaction ? (
        <ConfirmedOrSentTransaction
          txParsed={txParsed}
          paymentDescription={paymentDescription}
          timeDifferenceMinutes={timeDifferenceMinutes}
          timeDifferenceHours={timeDifferenceHours}
          timeDifferenceDays={timeDifferenceDays}
          timeDifferenceYears={timeDifferenceYears}
          navigate={navigate}
          props={props}
        />
      ) : (
        <div className="transaction-container">
          <ArrowUp
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
          />

          <div className="transaction-content">
            <ThemeText
              textContent={t(
                "contacts.internalComponents.contactsTransactions.requestTitle",
                {
                  amount: displayCorrectDenomination({
                    amount: txParsed.amountMsat / 1000,
                    masterInfoObject,
                    fiatStats,
                    useMillionDenomination: true,
                  }),
                }
              )}
            />
            <ThemeText
              textStyles={{
                fontWeight: 300,
                marginBottom: paymentDescription ? 0 : 15,
              }}
              className={"time-label"}
              textContent={getTimeDisplay(
                timeDifferenceMinutes,
                timeDifferenceHours,
                timeDifferenceDays,
                timeDifferenceYears
              )}
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
                "contacts.internalComponents.contactsTransactions.send"
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
