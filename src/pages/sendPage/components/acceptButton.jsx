import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGlobalContextProvider } from "../../../contexts/masterInfoObject";
import { useNodeContext } from "../../../contexts/nodeContext";
import { useActiveCustodyAccount } from "../../../contexts/activeAccount";
import { useOverlay } from "../../../contexts/overlayContext";
import CustomButton from "../../../components/customButton/customButton";
import { HIDDEN_OPACITY } from "../../../constants/theme";

export default function AcceptButtonSendPage({
  decodeSendAddress,
  errorMessageNavigation,
  btcAdress,
  paymentInfo,
  convertedSendAmount,
  paymentDescription,
  setPaymentInfo,
  setLoadingMessage,
  fromPage,
  sparkInformation,
  seletctedToken,
  useAltLayout,
  globalContactsInformation,
  canUseFastPay,
  selectedPaymentMethod,
  bitcoinBalance,
  dollarBalanceSat,
  isDecoding,
  poolInfoRef,
  swapLimits,
  min_usd_swap_amount,
  inputDenomination,
  paymentValidation,
  setDidSelectPaymentMethod,
  conversionFiatStats,
  primaryDisplay,
}) {
  const navigate = useNavigate();
  const { openOverlay } = useOverlay();
  const { t } = useTranslation();
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const { masterInfoObject } = useGlobalContextProvider();
  const { liquidNodeInformation, fiatStats } = useNodeContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();

  const handleEnterSendAmount = async () => {
    if (!paymentValidation.isValid) {
      const errorMessage = paymentValidation.getErrorMessage(
        paymentValidation.primaryError,
      );
      openOverlay({ for: "error", errorMessage });
      return;
    }

    setIsGeneratingInvoice(true);
    setDidSelectPaymentMethod(true);

    try {
      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject: {
          ...masterInfoObject,
          userBalanceDenomination: inputDenomination,
        },
        navigate,
        comingFromAccept: true,
        enteredPaymentInfo: {
          amount: convertedSendAmount,
          description: paymentDescription,
          lnInvoiceData: paymentInfo?.data?.invoice
            ? {
                pr: paymentInfo.data.invoice,
                successAction: paymentInfo.data.successAction,
              }
            : null,
        },
        paymentInfo,
        setLoadingMessage,
        parsedInvoice: paymentInfo.decodedInput,
        fromPage,
        sparkInformation,
        seletctedToken,
        currentWalletMnemoinc,
        t,
        sendWebViewRequest: null,
        globalContactsInformation,
        usablePaymentMethod: selectedPaymentMethod || "BTC",
        bitcoinBalance,
        dollarBalanceSat,
        convertedSendAmount,
        poolInfoRef,
        swapLimits,
        min_usd_swap_amount,
        conversionFiatStats,
        primaryDisplay,
      });
    } catch (error) {
      console.log("Accept button error:", error);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const memorizedStyles = useMemo(
    () => ({
      opacity: paymentValidation.isValid ? 1 : HIDDEN_OPACITY,
      width: "max-content",
    }),
    [paymentValidation],
  );

  return (
    <CustomButton
      buttonStyles={memorizedStyles}
      useLoading={isGeneratingInvoice || isDecoding}
      actionFunction={handleEnterSendAmount}
      textContent={
        canUseFastPay ? t("constants.confirm") : t("constants.review")
      }
    />
  );
}
