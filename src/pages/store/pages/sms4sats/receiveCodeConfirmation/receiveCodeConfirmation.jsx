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
import "../style.css";

export default function ReceiveCodeConfirmation({
  serviceCode,
  title,
  imgSrc,
  location,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation();
  const { backgroundOffset } = useThemeColors();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();

  const [invoiceInformation, setInvoiceInformation] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchInvoice() {
      setIsLoading(true);
      try {
        const payload = {
          country: location,
          service: serviceCode,
          ref: import.meta.env.VITE_GPT_PAYOUT_LNURL || "",
        };

        const response = await fetch(
          "https://api2.sms4sats.com/createorder",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
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
            t("errormessages.insufficientBalanceError", {
              planType: "SMS receive code",
            })
          );
        }

        if (!mounted) return;
        setInvoiceInformation({
          fee: fee.fee,
          supportFee: fee.supportFee,
          payreq: data.payreq,
          orderId: data.orderId,
          amountSat: decodedInvoice.satoshis,
          serviceCode,
          location,
          title,
          imgSrc,
        });
      } catch (err) {
        console.log("Error fetching receive invoice:", err);
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

  const handleConfirm = useCallback(() => {
    if (!invoiceInformation) return;
    onClose();
    onConfirm(invoiceInformation);
  }, [invoiceInformation, onClose, onConfirm]);

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
              textContent={t("apps.sms4sats.confirmationSlideUp.receiveTitle")}
              textStyles={{
                fontSize: "1.4rem",
                textAlign: "center",
                fontWeight: "600",
              }}
            />
            <ThemeText
              textContent={title}
              textStyles={{ fontSize: "1.1rem", textAlign: "center" }}
            />
            <FormattedSatText
              neverHideBalance={true}
              containerStyles={{ marginTop: "auto" }}
              styles={{ fontSize: "1.1rem", textAlign: "center" }}
              frontText={t("apps.sms4sats.confirmationSlideUp.price")}
              balance={invoiceInformation.amountSat}
            />
            <FormattedSatText
              neverHideBalance={true}
              containerStyles={{ marginTop: 10, marginBottom: "auto" }}
              styles={{ textAlign: "center" }}
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
