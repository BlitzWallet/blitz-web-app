import React, { useState, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { InputTypes } from "bitcoin-address-parser";
import { useGlobalContextProvider } from "../../../contexts/masterInfoObject";
import { useNodeContext } from "../../../contexts/nodeContext";
import { useActiveCustodyAccount } from "../../../contexts/activeAccount";
import CustomButton from "../../../components/customButton/customButton";
import displayCorrectDenomination from "../../../functions/displayCorrectDenomination";
import { SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT } from "../../../constants";

export default function AcceptButtonSendPage({
  canSendPayment,
  decodeSendAddress,
  errorMessageNavigation,
  btcAdress,
  paymentInfo,
  convertedSendAmount,
  paymentDescription,
  setPaymentInfo,
  setLoadingMessage,
  navigate,
  fromPage,
  publishMessageFunc,
  minLNURLSatAmount,
  maxLNURLSatAmount,
  sparkInformation,
  seletctedToken,
  isLRC20Payment,

  openOverlay,
}) {
  const { t } = useTranslation();
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const { masterInfoObject } = useGlobalContextProvider();
  const { liquidNodeInformation, fiatStats } = useNodeContext();

  const { currentWalletMnemoinc } = useActiveCustodyAccount();

  const isLNURLAmountValid = useMemo(() => {
    if (paymentInfo?.type !== InputTypes.LNURL_PAY) return true;
    return (
      convertedSendAmount >= minLNURLSatAmount &&
      convertedSendAmount <= maxLNURLSatAmount
    );
  }, [
    paymentInfo?.type,
    convertedSendAmount,
    minLNURLSatAmount,
    maxLNURLSatAmount,
  ]);

  const isBitcoinAmountValid = useMemo(() => {
    if (paymentInfo?.type !== InputTypes.BITCOIN_ADDRESS) return true;
    return convertedSendAmount >= SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT;
  }, [paymentInfo?.type, convertedSendAmount]);

  const isLRC20Valid = useMemo(() => {
    if (!isLRC20Payment) return true;
    console.log(
      sparkInformation.balance >= 10,
      seletctedToken?.balance,
      paymentInfo?.sendAmount * 10 ** seletctedToken?.tokenMetadata?.decimals,
      "tttt"
    );
    return (
      sparkInformation.balance >= 10 &&
      seletctedToken?.balance >=
        paymentInfo?.sendAmount * 10 ** seletctedToken?.tokenMetadata?.decimals
    );
  }, [isLRC20Payment, sparkInformation?.balance, seletctedToken, paymentInfo]);

  const handleBitcoinAmountError = () => {
    openOverlay({
      for: "error",
      errorMessage: t("wallet.sendPages.acceptButton.onchainError", {
        amount: displayCorrectDenomination({
          amount: SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT,
          fiatStats,
          masterInfoObject,
        }),
      }),
    });
  };

  const handleLNURLPayError = () => {
    const isMinError = convertedSendAmount < minLNURLSatAmount;
    const errorAmount = isMinError ? minLNURLSatAmount : maxLNURLSatAmount;

    openOverlay({
      for: "error",
      errorMessage: t("wallet.sendPages.acceptButton.lnurlPayError", {
        overFlowType: isMinError ? "Minimum" : "Maximum",
        amount: displayCorrectDenomination({
          amount: errorAmount,
          fiatStats,
          masterInfoObject,
        }),
      }),
    });
  };

  const handleLRC20Error = () => {
    openOverlay({
      for: "error",
      errorMessage:
        sparkInformation.balance >= 10
          ? t("wallet.sendPages.acceptButton.balanceError")
          : t("wallet.sendPages.acceptButton.lrc20FeeError", {
              amount: displayCorrectDenomination({
                amount: 10,
                masterInfoObject,
                fiatStats,
              }),
              balance: displayCorrectDenomination({
                amount: sparkInformation.balance,
                masterInfoObject,
                fiatStats,
              }),
            }),
    });
  };

  const handleInsufficientBalanceError = () => {
    openOverlay({
      for: "error",
      errorMessage: t("wallet.sendPages.acceptButton.noSendAmountError"),
    });
  };

  const handleNoSendAmountError = () => {
    openOverlay({
      for: "error",
      errorMessage: t("wallet.sendPages.acceptButton.balanceError"),
    });
  };

  const validatePaymentAmount = () => {
    console.log("validating payment amount");
    console.log(paymentInfo, "payment info");
    console.log(convertedSendAmount, "converted send amount");
    console.log(canSendPayment, "can send payment");
    console.log(!isBitcoinAmountValid);
    console.log(
      paymentInfo?.type === InputTypes.LNURL_PAY && !isLNURLAmountValid
    );
    console.log(!isLRC20Valid);
    console.log(!canSendPayment && !!paymentInfo?.sendAmount);
    console.log(isLRC20Payment);
    if (!paymentInfo?.sendAmount) {
      handleNoSendAmountError();
      return false;
    }

    // if (!isLiquidAmountValid) {
    //   handleLiquidAmountError();
    //   return false;
    // }

    if (!isBitcoinAmountValid) {
      handleBitcoinAmountError();
      return false;
    }

    if (paymentInfo?.type === InputTypes.LNURL_PAY && !isLNURLAmountValid) {
      handleLNURLPayError();
      return false;
    }

    if (!isLRC20Valid) {
      handleLRC20Error();
      return false;
    }

    if (!canSendPayment && !!paymentInfo?.sendAmount) {
      handleInsufficientBalanceError();
      return false;
    }

    return true;
  };

  const handleEnterSendAmount = async () => {
    if (!validatePaymentAmount()) {
      return;
    }

    setIsGeneratingInvoice(true);

    try {
      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        navigate,
        // maxZeroConf:
        //   minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept: true,
        enteredPaymentInfo: {
          amount: convertedSendAmount,
          description: paymentDescription,
        },
        paymentInfo,
        setLoadingMessage,
        parsedInvoice: paymentInfo.decodedInput,
        fromPage,
        publishMessageFunc,
        // webViewRef,
        sparkInformation,
        seletctedToken,
        currentWalletMnemoinc,
        t,
      });
    } catch (error) {
      console.log("Accept button error:", error);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <CustomButton
      buttonStyles={{ marginTop: "0" }}
      useLoading={isGeneratingInvoice}
      actionFunction={handleEnterSendAmount}
      textContent={t("constants.accept")}
    />
  );
}
