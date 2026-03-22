import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { decode } from "bolt11";
import ThemeText from "../../../../../components/themeText/themeText";
import FormattedSatText from "../../../../../components/formattedSatText/formattedSatText";
import CustomButton from "../../../../../components/customButton/customButton";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useGlobalContextProvider } from "../../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../../contexts/sparkContext";
import { useActiveCustodyAccount } from "../../../../../contexts/activeAccount";
import { sparkPaymenWrapper } from "../../../../../functions/spark/payments";
import sendStorePayment from "../../../../../functions/apps/payments";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import "../style.css";
import { useNavigate } from "react-router-dom";

export default function ConfirmationSlideUp({
  phoneNumber,
  areaCodeNum,
  message,
  onClose,
  setIsSending,
  setSendingMessage,
}) {
  const { t } = useTranslation();
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { decodedMessages, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const navigate = useNavigate();

  const [invoiceInformation, setInvoiceInformation] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formattedPhone = formatPhone(`${areaCodeNum}${phoneNumber}`);

  useEffect(() => {
    let mounted = true;
    async function fetchInvoice() {
      setIsLoading(true);
      try {
        const payload = {
          message,
          phone: `${areaCodeNum}${phoneNumber}`,
          ref: import.meta.env.VITE_GPT_PAYOUT_LNURL || "",
        };

        const response = await fetch(
          "https://api2.sms4sats.com/createsendorder",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();
        if (!data.payreq || !data.orderId) throw new Error(data.reason);

        const decodedInvoice = decode(data.payreq);

        const fee = await sparkPaymenWrapper({
          getFee: true,
          address: data.payreq,
          paymentType: "lightning",
          amountSats: decodedInvoice.satoshis,
          masterInfoObject,
          sparkInformation,
          userBalance: sparkInformation.balance,
          mnemonic: currentWalletMnemoinc,
        });

        if (!fee.didWork) throw new Error(t("errormessages.paymentFeeError"));

        if (
          sparkInformation.balance <
          decodedInvoice.satoshis + fee.supportFee + fee.fee
        ) {
          throw new Error(
            t("errormessages.insufficientBalanceError", { planType: "SMS" }),
          );
        }

        if (!mounted) return;
        setInvoiceInformation({
          fee: fee.fee,
          supportFee: fee.supportFee,
          payreq: data.payreq,
          orderId: data.orderId,
          amountSat: decodedInvoice.satoshis,
        });
      } catch (err) {
        console.log("Error fetching invoice:", err);
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchInvoice();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!invoiceInformation) return;
    onClose();

    setIsSending(true);
    setSendingMessage(t("apps.sms4sats.sendPage.payingMessage"));

    let savedMessages = JSON.parse(JSON.stringify(decodedMessages));

    try {
      savedMessages.sent.push({
        orderId: invoiceInformation.orderId,
        message,
        phone: `${areaCodeNum}${phoneNumber}`,
      });

      const paymentResponse = await sendStorePayment({
        invoice: invoiceInformation.payreq,
        masterInfoObject,
        sendingAmountSats: invoiceInformation.amountSat,
        paymentType: "lightning",
        fee: invoiceInformation.fee + invoiceInformation.supportFee,
        userBalance: sparkInformation.balance,
        sparkInformation,
        description: t("apps.sms4sats.sendPage.paymentMemo"),
        currentWalletMnemoinc,
      });

      console.log(savedMessages, invoiceInformation);
      await saveMessagesToDB(savedMessages);

      if (!paymentResponse.didWork) {
        setIsSending(false);
        setSendingMessage(paymentResponse.reason);
        return;
      }

      await listenForConfirmation(
        invoiceInformation,
        savedMessages,
        paymentResponse,
      );
    } catch (err) {
      setSendingMessage(err.message);
      console.log("SMS send error:", err);
    }
  }, [invoiceInformation]);

  async function listenForConfirmation(data, savedMessages, paymentResponse) {
    let didSettleInvoice = false;
    let runCount = 0;

    while (!didSettleInvoice && runCount < 10) {
      try {
        runCount += 1;
        const res = await fetch(
          `https://api2.sms4sats.com/orderstatus?orderId=${data.orderId}`,
        );
        const smsData = await res.json();

        if (
          smsData.paid &&
          (smsData.smsStatus === "delivered" || smsData.smsStatus === "sent")
        ) {
          didSettleInvoice = true;
          setIsSending(false);

          // Navigate to success
          navigate("/store-item", {
            state: { for: "sms4sats-history", selectedPage: "send" },
          });
        } else {
          setSendingMessage(
            t("apps.sms4sats.sendPage.runningTries", {
              runCount,
              maxTries: 10,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (err) {
        console.log("Order status error:", err);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!didSettleInvoice) {
      setSendingMessage(t("apps.sms4sats.sendPage.notAbleToSettleInvoice"));
    }
  }

  async function saveMessagesToDB(messageObject) {
    try {
      const em = await encryptMessage(
        contactsPrivateKey,
        publicKey,
        JSON.stringify(messageObject),
      );
      toggleGlobalAppDataInformation({ messagesApp: em }, true);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="sms4sats-modal-overlay" onClick={onClose}>
      <div
        className="sms4sats-modal-sheet"
        style={{ backgroundColor: backgroundOffset }}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && !error ? (
          <div className="sms4sats-spinner">
            <div className="sms4sats-spinner-circle" />
          </div>
        ) : error ? (
          <ThemeText
            textContent={error}
            textStyles={{ textAlign: "center", color: "#ef4444" }}
          />
        ) : invoiceInformation ? (
          <>
            <ThemeText
              textContent={t("apps.sms4sats.confirmationSlideUp.title")}
              textStyles={{
                fontSize: "1.4rem",
                textAlign: "center",
                fontWeight: "600",
              }}
            />
            <ThemeText
              textContent={formattedPhone}
              textStyles={{
                fontSize: "1.1rem",
                textAlign: "center",
                margin: 0,
              }}
            />
            <FormattedSatText
              neverHideBalance={true}
              containerStyles={{ marginTop: "auto" }}
              styles={{
                fontSize: "1.1rem",
                textAlign: "center",
                marginTop: 0,
                marginBottom: 0,
              }}
              frontText={t("apps.sms4sats.confirmationSlideUp.price")}
              balance={invoiceInformation.amountSat}
            />
            <FormattedSatText
              neverHideBalance={true}
              containerStyles={{ marginTop: 0, marginBottom: "auto" }}
              styles={{ textAlign: "center", marginTop: 0, marginBottom: 0 }}
              frontText={t("apps.sms4sats.confirmationSlideUp.fee")}
              balance={invoiceInformation.fee + invoiceInformation.supportFee}
            />
            <CustomButton
              buttonStyles={{ width: "95%", marginTop: 16 }}
              actionFunction={handleConfirm}
              textContent={t("constants.confirm")}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatPhone(number) {
  if (!number) return number;
  const cleaned = number.replace(/\D/g, "");
  return cleaned.length > 0 ? `+${cleaned}` : number;
}
