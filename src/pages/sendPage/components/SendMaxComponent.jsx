import { useCallback, useState } from "react";
import { InputTypes } from "bitcoin-address-parser";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../components/themeText/themeText";
import { SATSPERBITCOIN } from "../../../constants";
import { useActiveCustodyAccount } from "../../../contexts/activeAccount";
import { useOverlay } from "../../../contexts/overlayContext";
import { getLNAddressForLiquidPayment } from "../../../functions/sendBitcoin/payments";
import { sparkPaymenWrapper } from "../../../functions/spark/payments";
import "./sendMaxComponent.css";

const MAX_SEND_OPTIONS = [
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];

export default function SendMaxComponent({
  fiatStats,
  sparkInformation,
  paymentInfo,
  masterInfoObject,
  setPaymentInfo,
  paymentType,
  seletctedToken,
  selectedLRC20Asset,
  useAltLayout,
}) {
  const { t } = useTranslation();
  const { openOverlay } = useOverlay();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const [isGettingMax, setIsGettingMax] = useState(false);

  const selectedAsset = selectedLRC20Asset || "Bitcoin";
  const sendMaxLabel = (() => {
    const value = t("wallet.sendPages.sendMaxComponent.sendMax");
    return !value || value === "wallet.sendPages.sendMaxComponent.sendMax"
      ? "Send max"
      : value;
  })();

  const handleSelectProcess = useCallback(
    async (percent = 100) => {
      if (isGettingMax) return;

      try {
        const balance =
          selectedAsset.toLowerCase() === "bitcoin"
            ? Number(sparkInformation?.balance || 0)
            : Number(seletctedToken?.balance || 0);

        const sendingBalance = Math.round(balance * (percent / 100));
        setIsGettingMax(true);

        if (selectedAsset !== "Bitcoin") {
          const decimals = seletctedToken?.tokenMetadata?.decimals || 8;
          const converted = parseFloat(
            (sendingBalance / Math.pow(10, decimals)).toFixed(decimals),
          );

          setPaymentInfo((prev) => ({
            ...prev,
            sendAmount: parseFloat(converted.toFixed(decimals)).toString(),
          }));
          return;
        }

        let address = paymentInfo?.address;

        if (paymentInfo?.type === InputTypes.LNURL_PAY) {
          const invoice = await getLNAddressForLiquidPayment(
            paymentInfo,
            Number(sendingBalance),
          );
          address = invoice?.pr;
        }

        const feeResponse = await sparkPaymenWrapper({
          getFee: true,
          address,
          paymentType: String(paymentType || paymentInfo?.paymentNetwork || "")
            .toLowerCase(),
          amountSats: Number(sendingBalance),
          masterInfoObject,
          seletctedToken: selectedAsset,
          mnemonic: currentWalletMnemoinc,
        });

        if (!feeResponse?.didWork) {
          throw new Error(
            feeResponse?.error || t("errormessages.paymentFeeError"),
          );
        }

        const feeBuffer = (feeResponse.fee + feeResponse.supportFee) * 1.1;
        const maxAmountSats = Math.max(
          Number(sendingBalance) - feeBuffer,
          0,
        );

        const convertedMax =
          masterInfoObject.userBalanceDenomination !== "fiat"
            ? Math.round(maxAmountSats)
            : (
                Number(maxAmountSats) /
                Math.round(SATSPERBITCOIN / (fiatStats?.value || 65000))
              ).toFixed(3);

        setPaymentInfo((prev) => ({
          ...prev,
          sendAmount: String(convertedMax),
          feeQuote: feeResponse.feeQuote,
          paymentFee: feeResponse.fee,
          supportFee: feeResponse.supportFee,
        }));
      } catch (error) {
        openOverlay({
          for: "error",
          errorMessage:
            error?.message || "Unable to calculate the maximum send amount.",
        });
      } finally {
        setIsGettingMax(false);
      }
    },
    [
      currentWalletMnemoinc,
      fiatStats?.value,
      isGettingMax,
      masterInfoObject,
      openOverlay,
      paymentInfo,
      paymentType,
      selectedAsset,
      seletctedToken,
      setPaymentInfo,
      sparkInformation?.balance,
      t,
    ],
  );

  return (
    <div className="send-max-container">
      <button
        type="button"
        className={`send-max-pill ${useAltLayout ? "compact" : ""}`}
        disabled={isGettingMax}
        onClick={() => handleSelectProcess(100)}
      >
        <ThemeText textContent={sendMaxLabel} />
      </button>

      {MAX_SEND_OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`send-max-pill ${useAltLayout ? "compact" : ""}`}
          disabled={isGettingMax}
          onClick={() => handleSelectProcess(item.value)}
        >
          <ThemeText textContent={item.label} />
        </button>
      ))}
    </div>
  );
}
