import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./send.css";
import { useLocation, useNavigate } from "react-router-dom";
import { sparkPaymenWrapper } from "../../functions/spark/payments";
import {
  isSendingPayingEventEmiiter,
  SENDING_PAYMENT_EVENT_NAME,
  useSpark,
} from "../../contexts/sparkContext";
import FullLoadingScreen from "../../components/fullLoadingScreen/fullLoadingScreen";
import { Colors, HIDDEN_OPACITY } from "../../constants/theme";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import ErrorWithPayment from "./components/errorScreen";
import decodeSendAddress from "../../functions/sendBitcoin/decodeSendAdress";
import {
  QUICK_PAY_STORAGE_KEY,
  SATSPERBITCOIN,
  SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT,
  USDB_TOKEN_ID,
} from "../../constants";
import CustomInput from "../../components/customInput/customInput";
import NumberInputSendPage from "./components/numberInput";
import CustomButton from "../../components/customButton/customButton";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import formatSparkPaymentAddress from "../../functions/sendBitcoin/formatSparkPaymentAddress";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { useTranslation } from "react-i18next";
import { InputTypes } from "bitcoin-address-parser";
import ThemeText from "../../components/themeText/themeText";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";
import CustomSettingsNavbar from "../../components/customSettingsNavbar";
import AcceptButtonSendPage from "./components/acceptButton";
import { useOverlay } from "../../contexts/overlayContext";
import NavBarWithBalance from "../../components/navBarWithBalance/navbarWithBalance";
import {
  handlePaymentUpdate,
  publishMessage,
} from "../../functions/messaging/publishMessage";
import { useKeysContext } from "../../contexts/keysContext";
import SendTransactionFeeInfo from "./components/feeInfo";
import { useThemeContext } from "../../contexts/themeContext";
import InvoiceInfo from "./components/invoiceInfo";
import ChooseLRC20TokenContainer from "./components/ChooseLRC20TokenContainer";
import ChoosePaymentMethod from "./components/ChoosePaymentMethodContainer";
import SwapRatesChangedState from "./components/SwapRatesChangedState";
import { useFlashnet } from "../../contexts/flashnetContext";
import { useUserBalanceContext } from "../../contexts/userBalanceContext";
import { useGlobalContacts } from "../../contexts/globalContacts";
import useThemeColors from "../../hooks/useThemeColors";
import { useToast } from "../../contexts/toastManager";
import usePaymentInputDisplay from "../../hooks/usePaymentInputDisplay";
import usePaymentValidation from "../../functions/sendBitcoin/paymentValidation";
import { bulkUpdateSparkTransactions } from "../../functions/spark/transactions";
import normalizeLNURLAddress from "../../functions/lnurl/normalizeLNURLAddress";
import {
  dollarsToSats,
  satsToDollars,
  getLightningPaymentQuote,
  USD_ASSET_ADDRESS,
} from "../../functions/spark/flashnet";
import customUUID from "../../functions/customUUID";
import useDebounce from "../../hooks/useDebounce";
import convertTextInputValue from "../../functions/textInputConvertValue";
import { useBudgetWarning } from "../../hooks/useBudgetWarning";
import { getLNAddressForLiquidPayment } from "../../functions/sendBitcoin/payments";
import EmojiQuickBar from "../../components/emojiBar/emojiQuickBar";
import FormattedBalanceInput from "../../components/formattedBalanceInput/formattedBalanceInput";
import SwipeButton from "../../components/swipeThumb/swipeThumb";
import PageNavBar from "../../components/navBar/navBar";

export default function SendPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const params = location.state || {};
  const {
    btcAddress: btcAdress,
    fromPage,
    publishMessageFuncParms,
    comingFromAccept,
    enteredPaymentInfo = {},
    errorMessage: globalError,
    contactInfo,
    masterTokenInfo = {},
    selectedPaymentMethod = "",
    preSelectedPaymentMethod,
    selectedContact,
    retrivedContact,
  } = params;

  const paramsRef = useRef({ btcAdress });
  const { poolInfoRef, swapLimits, swapUSDPriceDollars } = useFlashnet();
  const { t } = useTranslation();
  const { bitcoinBalance, dollarBalanceSat, dollarBalanceToken } =
    useUserBalanceContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { contactsPrivateKey, publicKey, accountMnemoinc } = useKeysContext();
  const { sparkInformation, showTokensInformation, sparkInfoRef } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const { liquidNodeInformation, fiatStats } = useNodeContext();
  const { globalContactsInformation } = useGlobalContacts();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const didDecode = useRef(null);

  const didWarnAboutBudget = useRef(null);
  const [isAmountFocused, setIsAmountFocused] = useState(true);
  const [showProgressAnimation, setShowProgressAnimation] = useState(false);
  const hasTriggeredFastPay = useRef(false);
  const convertedSendAmountRef = useRef(null);
  const determinePaymentMethodRef = useRef(null);
  const didRequireChoiceRef = useRef(false);
  const uiStateRef = useRef(null);
  const primaryDisplayRef = useRef(null);
  const conversionFiatStatsRef = useRef(null);
  const quoteId = useRef(null);

  const [rateChangeDetected, setRateChangeDetected] = useState(false);
  const rateAtConfirmEntryRef = useRef(null);

  const [didSelectPaymentMethod, setDidSelectPaymentMethod] = useState(false);
  const [isDecoding, setIsDecoding] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState({});
  const [lnFeeEstimate, setLnFeeEstimate] = useState(
    enteredPaymentInfo?.lnFeeEstimate ?? null,
  );
  const [isEstimatingFee, setIsEstimatingFee] = useState(false);

  const prevSelectedPaymentInfo = useRef({
    preSelectedPaymentMethod,
    enteredInfo: enteredPaymentInfo?.inputCurrency,
    selectedPaymentMethod,
    selectedLRC20Asset: masterTokenInfo?.tokenName,
  });

  const paymentMode =
    preSelectedPaymentMethod === "USD" ||
    enteredPaymentInfo?.inputCurrency === "USD" ||
    selectedPaymentMethod === "USD"
      ? "USD"
      : "BTC";

  const [userSetInputDenomination, setUserSetInputDenomination] =
    useState(null);

  const inputDenomination = userSetInputDenomination
    ? userSetInputDenomination
    : paymentMode === "USD"
      ? "fiat"
      : masterInfoObject.userBalanceDenomination !== "fiat"
        ? "sats"
        : "fiat";

  const inputDenominationRef = useRef(inputDenomination);
  const [paymentDescription, setPaymentDescription] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(
    sparkInformation.didConnect
      ? t("wallet.sendPages.sendPaymentScreen.initialLoadingMessage")
      : t("wallet.sendPages.sendPaymentScreen.connectToSparkMessage"),
  );
  const [refreshDecode, setRefreshDecode] = useState(0);
  const isSendingPayment = useRef(null);
  const userPaymentMethod = selectedPaymentMethod || preSelectedPaymentMethod;
  const combinedPaymentDescription =
    paymentDescription ||
    paymentInfo?.data?.label ||
    paymentInfo?.data?.message ||
    "";

  const isLightningPayment = paymentInfo?.paymentNetwork === "lightning";
  const isLiquidPayment = paymentInfo?.paymentNetwork === "liquid";
  const isBitcoinPayment = paymentInfo?.paymentNetwork === "Bitcoin";
  const isSparkPayment = paymentInfo?.paymentNetwork === "spark";
  const isLNURLPayment = paymentInfo?.type === InputTypes.LNURL_PAY;

  const enabledLRC20 = showTokensInformation;
  const defaultToken = enabledLRC20
    ? masterInfoObject?.defaultSpendToken || "Bitcoin"
    : "Bitcoin";

  const useFullTokensDisplay =
    enabledLRC20 &&
    isSparkPayment &&
    paymentInfo?.data?.expectedToken !== USDB_TOKEN_ID &&
    !contactInfo;

  const min_usd_swap_amount = useMemo(() => {
    return Math.round(
      dollarsToSats(swapLimits.usd, poolInfoRef.currentPriceAInB),
    );
  }, [poolInfoRef.currentPriceAInB, swapLimits]);

  const minLNURLSatAmount = isLNURLPayment
    ? paymentInfo?.data?.minSendable / 1000
    : 0;
  const maxLNURLSatAmount = isLNURLPayment
    ? paymentInfo?.data?.maxSendable / 1000
    : 0;

  const selectedLRC20Asset = masterTokenInfo?.tokenName || defaultToken;
  const seletctedToken =
    masterTokenInfo?.details ||
    sparkInformation?.tokens?.[selectedLRC20Asset] ||
    {};
  const tokenDecimals = seletctedToken?.tokenMetadata?.decimals ?? 0;
  const tokenBalance = seletctedToken?.balance ?? 0;
  const isUsingLRC20 = selectedLRC20Asset?.toLowerCase() !== "bitcoin";

  const sendingAmount = paymentInfo?.sendAmount || 0;
  const canEditAmount = paymentInfo?.canEditPayment === true;
  const receiverExpectsCurrency = paymentInfo?.data?.expectedReceive || "sats";

  const amountViableForSwap = useMemo(() => {
    if (canEditAmount || paymentInfo?.usingZeroAmountInvoice) return true;
    const amountSat = Number(paymentInfo?.amountSat) || 0;
    if (receiverExpectsCurrency === "tokens")
      return amountSat >= min_usd_swap_amount;
    return amountSat >= swapLimits.bitcoin;
  }, [
    canEditAmount,
    paymentInfo?.usingZeroAmountInvoice,
    paymentInfo?.amountSat,
    paymentInfo?.data?.expectedReceive,
    min_usd_swap_amount,
    swapLimits.bitcoin,
    receiverExpectsCurrency,
  ]);

  const isBTCOnlyPayment =
    isBitcoinPayment ||
    (isLightningPayment && paymentInfo?.usingZeroAmountInvoice);

  const resolvedPaymentMethod = useMemo(() => {
    if (!paymentInfo || !Object.keys(paymentInfo || {}).length)
      return undefined;

    if (isBitcoinPayment) return "BTC";
    if (isUsingLRC20) return "BTC";
    if (isSparkPayment && useFullTokensDisplay) return "BTC";
    if (isLightningPayment && paymentInfo?.usingZeroAmountInvoice) return "BTC";

    const flashnetReady = sparkInformation?.didConnectToFlashnet;
    const receiverExpectsTokens = receiverExpectsCurrency === "tokens";
    const amountSat = paymentInfo?.amountSat || 0;

    const canUse = (method) => {
      if (method === "USD") {
        if (Number(dollarBalanceToken) < 0.01) return false;
        if (receiverExpectsTokens) return dollarBalanceSat >= amountSat;
        return (
          flashnetReady &&
          Number(dollarBalanceToken) >= swapLimits.usd &&
          amountViableForSwap
        );
      } else {
        if (!bitcoinBalance) return false;
        if (receiverExpectsTokens)
          return (
            flashnetReady &&
            bitcoinBalance >= swapLimits.bitcoin &&
            amountViableForSwap
          );
        return bitcoinBalance >= amountSat;
      }
    };

    const resolvePreferred = (preferred) => {
      if (canUse(preferred)) return preferred;
      const opposite = preferred === "USD" ? "BTC" : "USD";
      if (canUse(opposite)) return opposite;
      return preferred;
    };

    if (preSelectedPaymentMethod)
      return resolvePreferred(preSelectedPaymentMethod);
    if (userPaymentMethod) return userPaymentMethod;
    if (enteredPaymentInfo?.inputCurrency)
      return resolvePreferred(enteredPaymentInfo.inputCurrency);

    const btcViable = canUse("BTC");
    const usdViable = canUse("USD");
    if (btcViable && usdViable)
      return receiverExpectsTokens
        ? dollarBalanceSat >= bitcoinBalance
          ? "USD"
          : "BTC"
        : bitcoinBalance >= dollarBalanceSat
          ? "BTC"
          : "USD";
    if (btcViable) return "BTC";
    if (usdViable) return "USD";
    return "BTC";
  }, [
    preSelectedPaymentMethod,
    enteredPaymentInfo?.inputCurrency,
    userPaymentMethod,
    paymentInfo,
    dollarBalanceSat,
    dollarBalanceToken,
    bitcoinBalance,
    isBitcoinPayment,
    isUsingLRC20,
    isSparkPayment,
    useFullTokensDisplay,
    isLightningPayment,
    sparkInformation?.didConnectToFlashnet,
    swapLimits,
    canEditAmount,
    min_usd_swap_amount,
    amountViableForSwap,
    receiverExpectsCurrency,
  ]);

  const paymentFee =
    resolvedPaymentMethod === "USD" && paymentInfo?.usdPaymentFee != null
      ? (paymentInfo.usdPaymentFee || 0) + (paymentInfo.usdSupportFee || 0)
      : (paymentInfo?.paymentFee || 0) + (paymentInfo?.supportFee || 0);

  const effectivePaymentFee =
    isLightningPayment && lnFeeEstimate !== null
      ? lnFeeEstimate + (paymentInfo?.supportFee || 0)
      : paymentFee;

  const usdFiatStats = useMemo(
    () => ({ coin: "USD", value: swapUSDPriceDollars }),
    [swapUSDPriceDollars],
  );

  const {
    primaryDisplay,
    secondaryDisplay,
    conversionFiatStats,
    convertSatsToDisplay,
    convertDisplayToSats,
    getNextDenomination,
    convertForToggle,
  } = usePaymentInputDisplay({
    paymentMode: resolvedPaymentMethod,
    inputDenomination,
    fiatStats,
    usdFiatStats: usdFiatStats,
    masterInfoObject,
    isSendingPayment: isSendingPayment.current,
  });

  const displayAmount = canEditAmount
    ? sendingAmount
    : convertSatsToDisplay(sendingAmount);

  const convertedSendAmount = !isUsingLRC20
    ? canEditAmount
      ? convertDisplayToSats(sendingAmount)
      : Number(sendingAmount)
    : Number(sendingAmount);

  const fiatValueConvertedSendAmount = Math.round(
    satsToDollars(
      convertedSendAmount,
      enteredPaymentInfo?.stablePoolInfoRef?.currentPriceAInB ||
        poolInfoRef.currentPriceAInB,
    ).toFixed(2) * Math.pow(10, 6),
  );

  const requiresUserMethodSelection = useMemo(() => {
    if (resolvedPaymentMethod === undefined) return false;
    if (
      !!preSelectedPaymentMethod ||
      useFullTokensDisplay ||
      isUsingLRC20 ||
      didSelectPaymentMethod
    )
      return false;

    if (!sparkInformation?.didConnectToFlashnet) return false;

    if (isBitcoinPayment) return false;

    const formattedFee = isLightningPayment ? effectivePaymentFee : 0;

    const hasEnoughBTC = bitcoinBalance >= convertedSendAmount + formattedFee;
    const hasEnoughUSD = dollarBalanceSat >= convertedSendAmount + formattedFee;

    const canSendWithBTC =
      resolvedPaymentMethod === "BTC" && receiverExpectsCurrency === "sats"
        ? hasEnoughBTC
        : hasEnoughBTC && amountViableForSwap;

    const canSendWIthUSD =
      resolvedPaymentMethod === "USD" && receiverExpectsCurrency === "tokens"
        ? hasEnoughUSD
        : hasEnoughUSD && amountViableForSwap;

    if (
      (canSendWithBTC && canSendWIthUSD) ||
      (!canSendWithBTC && !canSendWIthUSD)
    )
      return true;
    else return false;
  }, [
    isBitcoinPayment,
    useFullTokensDisplay,
    isUsingLRC20,
    didSelectPaymentMethod,
    sparkInformation?.didConnectToFlashnet,
    paymentInfo?.data?.expectedReceive,
    bitcoinBalance,
    dollarBalanceSat,
    amountViableForSwap,
    resolvedPaymentMethod,
    receiverExpectsCurrency,
    preSelectedPaymentMethod,
    isLightningPayment,
  ]);

  const { shouldWarn } = useBudgetWarning(convertedSendAmount);

  useEffect(() => {
    primaryDisplayRef.current = primaryDisplay;
  }, [primaryDisplay]);
  useEffect(() => {
    conversionFiatStatsRef.current = conversionFiatStats;
  }, [conversionFiatStats]);
  useEffect(() => {
    determinePaymentMethodRef.current = resolvedPaymentMethod;
  }, [resolvedPaymentMethod]);

  const estimateLightningFee = useCallback(
    async (amount, id) => {
      if (!amount || !isLightningPayment || !canEditAmount) {
        setIsEstimatingFee(false);
        return;
      }
      if (quoteId.current !== id) return;

      const balance =
        resolvedPaymentMethod === "USD" ? dollarBalanceSat : bitcoinBalance;
      const bufferAmount = amount * 1.1;

      if (bufferAmount < balance || amount > balance) {
        setIsEstimatingFee(false);
        return;
      }

      try {
        const formattedSparkPaymentInfo = formatSparkPaymentAddress(
          paymentInfo,
          false,
        );
        let invoice = formattedSparkPaymentInfo.address;
        if (paymentInfo.type === InputTypes.LNURL_PAY && !invoice) {
          const invoiceResponse = await getLNAddressForLiquidPayment(
            paymentInfo.decodedInput,
            amount,
          );

          if (!invoiceResponse.pr) throw new Error("No invoice received");
          invoice = invoiceResponse.pr;
          setPaymentInfo((prev) => ({
            ...prev,
            data: { ...(prev.data || {}), invoice },
          }));
        }

        if (!invoice) {
          setIsEstimatingFee(false);
          return;
        }
        if (resolvedPaymentMethod === "USD") {
          const quote = await getLightningPaymentQuote(
            currentWalletMnemoinc,
            invoice,
            USD_ASSET_ADDRESS,
          );
          if (!quote.didWork)
            throw new Error(quote.error || "Fee quote failed");
          if (quoteId.current !== id) return;
          const estimatedAmmFeeSat = Math.round(
            dollarsToSats(
              quote.quote.estimatedAmmFee / Math.pow(10, 6),
              poolInfoRef.currentPriceAInB,
            ),
          );
          const fee = quote.quote.fee + estimatedAmmFeeSat;
          if (fee + amount > dollarBalanceSat) {
            showToast({
              type: "error",
              title: t("errormessages.lightningAmountFeeWarning", {
                amount: displayCorrectDenomination({
                  amount: fee,
                  masterInfoObject: {
                    ...masterInfoObject,
                    userBalanceDenomination: "sats",
                  },
                  fiatStats,
                }),
              }),
              duration: 6000,
            });
          }
          setLnFeeEstimate(fee);
          setPaymentInfo((prev) => ({
            ...prev,
            paymentFee: fee,
            supportFee: prev.supportFee ?? 0,
            swapPaymentQuote: {
              ...quote.quote,
              bitcoinBalance,
              dollarBalanceSat,
            },
          }));
        } else {
          const feeResult = await sparkPaymenWrapper({
            getFee: true,
            paymentType: "lightning",
            address: invoice,
            amountSats: amount,
            masterInfoObject,
            sparkInformation: sparkInfoRef.current,
            mnemonic: currentWalletMnemoinc,
            sendWebViewRequest: null,
          });
          if (!feeResult.didWork) throw new Error("Fee estimation failed");
          if (quoteId.current !== id) return;
          const fee = feeResult.fee;
          if (fee + amount > bitcoinBalance) {
            showToast({
              type: "error",
              title: t("errormessages.lightningAmountFeeWarning", {
                amount: displayCorrectDenomination({
                  amount: fee,
                  masterInfoObject: {
                    ...masterInfoObject,
                    userBalanceDenomination: "sats",
                  },
                  fiatStats,
                }),
              }),
              duration: 6000,
            });
          }
          setLnFeeEstimate(fee);
          setPaymentInfo((prev) => ({
            ...prev,
            paymentFee: fee,
            supportFee: prev.supportFee ?? 0,
          }));
        }
      } catch {
        showToast({
          type: "error",
          title: t("wallet.sendPages.sendPaymentScreen.feeEstimateError"),
        });
      } finally {
        if (quoteId.current === id) {
          setIsEstimatingFee(false);
        }
      }
    },
    [
      isLightningPayment,
      canEditAmount,
      resolvedPaymentMethod,
      dollarBalanceSat,
      bitcoinBalance,
      paymentInfo,
      currentWalletMnemoinc,
      masterInfoObject,
      fiatStats,
      sparkInfoRef,
      showToast,
      t,
    ],
  );

  const debouncedEstimateFee = useDebounce(estimateLightningFee, 600);

  useEffect(() => {
    inputDenominationRef.current = inputDenomination;
  }, [inputDenomination]);

  useEffect(() => {
    if (
      resolvedPaymentMethod === "USD" &&
      paymentMode !== "USD" &&
      !userSetInputDenomination
    ) {
      setUserSetInputDenomination("fiat");
    }
  }, [resolvedPaymentMethod, paymentMode, userSetInputDenomination]);

  useEffect(() => {
    if (requiresUserMethodSelection && !didRequireChoiceRef.current) {
      didRequireChoiceRef.current = true;
    }
  }, [requiresUserMethodSelection]);

  const canUseFastPay =
    sparkInformation.didConnect &&
    Object.keys(paymentInfo || {}).length > 0 &&
    masterInfoObject[QUICK_PAY_STORAGE_KEY]?.isFastPayEnabled &&
    masterInfoObject[QUICK_PAY_STORAGE_KEY]?.fastPayThresholdSats >=
      convertedSendAmount &&
    !isUsingLRC20 &&
    (!didRequireChoiceRef.current || didSelectPaymentMethod) &&
    !requiresUserMethodSelection &&
    convertedSendAmount >= effectivePaymentFee &&
    !shouldWarn;

  const uiState = useMemo(() => {
    if (canEditAmount && !isSendingPayment.current) {
      return "EDIT_AMOUNT";
    }
    if (rateChangeDetected) {
      return "SWAP_RATES_CHANGED";
    }
    if (
      requiresUserMethodSelection &&
      !isSendingPayment.current &&
      !isBitcoinPayment &&
      !isUsingLRC20 &&
      !preSelectedPaymentMethod
    ) {
      return "CHOOSE_METHOD";
    }
    return "CONFIRM_PAYMENT";
  }, [
    canEditAmount,
    rateChangeDetected,
    requiresUserMethodSelection,
    didSelectPaymentMethod,
    isBitcoinPayment,
    isUsingLRC20,
    canUseFastPay,
    preSelectedPaymentMethod,
  ]);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

  useEffect(() => {
    if (
      uiState === "CONFIRM_PAYMENT" &&
      shouldWarn &&
      !didWarnAboutBudget.current &&
      !isSendingPayment.current &&
      !isDecoding
    ) {
      didWarnAboutBudget.current = true;
      openOverlay({
        for: "halfModal",
        contentType: "nearBudgetLimitWarning",
        params: { sendingAmount: convertedSendAmount },
      });
    }
  }, [uiState, shouldWarn, convertedSendAmount, isDecoding, openOverlay]);

  useEffect(() => {
    if (
      prevSelectedPaymentInfo.current.preSelectedPaymentMethod !==
        preSelectedPaymentMethod ||
      prevSelectedPaymentInfo.current.enteredInfo !==
        enteredPaymentInfo?.inputCurrency ||
      prevSelectedPaymentInfo.current.selectedPaymentMethod !==
        selectedPaymentMethod ||
      prevSelectedPaymentInfo.current.selectedLRC20Asset !== selectedLRC20Asset
    ) {
      if (uiStateRef.current !== "EDIT_AMOUNT") return;
      setPaymentInfo((prev) => ({ ...prev, sendAmount: "" }));
      setUserSetInputDenomination(null);
      prevSelectedPaymentInfo.current = {
        preSelectedPaymentMethod,
        enteredInfo: enteredPaymentInfo?.inputCurrency,
        selectedPaymentMethod,
        selectedLRC20Asset,
      };
    }
  }, [
    preSelectedPaymentMethod,
    enteredPaymentInfo?.inputCurrency,
    selectedPaymentMethod,
    selectedLRC20Asset,
  ]);

  const paymentValidation = usePaymentValidation({
    paymentInfo,
    convertedSendAmount,
    paymentFee: effectivePaymentFee,
    determinePaymentMethod: resolvedPaymentMethod,
    selectedPaymentMethod: userPaymentMethod,
    bitcoinBalance,
    dollarBalanceSat,
    dollarBalanceToken,
    min_usd_swap_amount,
    swapLimits,
    isUsingLRC20,
    seletctedToken,
    minLNURLSatAmount,
    maxLNURLSatAmount,
    isDecoding,
    canEditAmount,
    t,
    masterInfoObject,
    fiatStats,
    inputDenomination: primaryDisplay.denomination,
    primaryDisplay,
    conversionFiatStats,
    sparkInformation,
    poolInfoRef,
  });

  const canSendPayment =
    paymentValidation.canProceed &&
    sendingAmount !== 0 &&
    uiState === "CONFIRM_PAYMENT";

  const isUsingFastPay = canUseFastPay && canSendPayment && !canEditAmount;

  const needsRateSwap =
    (resolvedPaymentMethod === "USD" && receiverExpectsCurrency === "sats") ||
    (resolvedPaymentMethod === "BTC" && receiverExpectsCurrency === "tokens");

  useEffect(() => {
    if (isDecoding) return;
    if (uiState === "CONFIRM_PAYMENT") {
      if (rateAtConfirmEntryRef.current === null) {
        rateAtConfirmEntryRef.current = swapUSDPriceDollars;
      }
      if (
        rateAtConfirmEntryRef.current !== null &&
        swapUSDPriceDollars !== rateAtConfirmEntryRef.current &&
        !paymentValidation.canProceed &&
        needsRateSwap &&
        !isSendingPayment.current
      ) {
        setRateChangeDetected(true);
      }
    } else if (uiState !== "SWAP_RATES_CHANGED") {
      rateAtConfirmEntryRef.current = null;
      setRateChangeDetected(false);
    }
  }, [
    uiState,
    swapUSDPriceDollars,
    paymentValidation.canProceed,
    needsRateSwap,
    isDecoding,
  ]);

  const errorMessageNavigation = useCallback(
    (reason) => {
      openOverlay({
        for: "error",
        errorMessage:
          reason ||
          t("wallet.sendPages.sendPaymentScreen.fallbackErrorMessage"),
      });
    },
    [openOverlay, t],
  );

  const handleRateChangedReset = useCallback(() => {
    rateAtConfirmEntryRef.current = null;
    setRateChangeDetected(false);
    if (isLNURLPayment || isSparkPayment) {
      setIsAmountFocused(true);
      setPaymentInfo({});
      setLnFeeEstimate(null);
      setIsEstimatingFee(false);
      isSendingPayment.current = null;
      setPaymentDescription("");
      hasTriggeredFastPay.current = false;
      didRequireChoiceRef.current = false;
      setUserSetInputDenomination(null);
      didDecode.current = false;
      setLoadingMessage(
        sparkInformation.didConnect && sparkInformation.identityPubKey
          ? t("wallet.sendPages.sendPaymentScreen.initialLoadingMessage")
          : t("wallet.sendPages.sendPaymentScreen.connectToSparkMessage"),
      );
      setDidSelectPaymentMethod(false);
      setShowProgressAnimation(false);
      setRefreshDecode((x) => x + 1);
    } else {
      navigate(-1);
    }
  }, [
    isLNURLPayment,
    isSparkPayment,
    navigate,
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    t,
  ]);

  useEffect(() => {
    const currentParams = { btcAdress };
    const prevParams = paramsRef.current;

    const hasParamsChanged =
      currentParams.btcAdress &&
      currentParams.btcAdress !== prevParams.btcAdress;

    if (hasParamsChanged) {
      setIsAmountFocused(true);
      setPaymentInfo({});
      setLnFeeEstimate(null);
      setIsEstimatingFee(false);
      isSendingPayment.current = null;
      setPaymentDescription("");
      hasTriggeredFastPay.current = false;
      didRequireChoiceRef.current = false;
      setLoadingMessage(
        !!sparkInformation.didConnect && !!sparkInformation.identityPubKey
          ? t("wallet.sendPages.sendPaymentScreen.initialLoadingMessage")
          : t("wallet.sendPages.sendPaymentScreen.connectToSparkMessage"),
      );
      setDidSelectPaymentMethod(false);
      setShowProgressAnimation(false);
      setRefreshDecode((x) => x + 1);
      paramsRef.current = currentParams;
    }
  }, [
    btcAdress,
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    t,
  ]);

  useEffect(() => {
    convertedSendAmountRef.current = convertedSendAmount;
  }, [convertedSendAmount]);

  useEffect(() => {
    if (!canEditAmount || !isLightningPayment) return;
    setLnFeeEstimate(null);
    setPaymentInfo((prev) => ({
      ...prev,
      data: { ...(prev.data || {}), invoice: "" },
      paymentFee: 0,
    }));
    if (convertedSendAmount > 0) {
      const id = customUUID();
      quoteId.current = id;
      setIsEstimatingFee(true);
      debouncedEstimateFee(convertedSendAmount, id);
    }
  }, [convertedSendAmount, canEditAmount, isLightningPayment]);

  useEffect(() => {
    async function decodePayment() {
      setIsDecoding(true);
      await decodeSendAddress({
        fiatStats,
        btcAdress: paramsRef.current.btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject: {
          ...masterInfoObject,
          userBalanceDenomination: inputDenominationRef.current,
        },
        navigate,
        comingFromAccept: enteredPaymentInfo.fromContacts,
        enteredPaymentInfo,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        sparkInformation,
        seletctedToken,
        currentWalletMnemoinc,
        t,
        sendWebViewRequest: null,
        contactInfo,
        globalContactsInformation,
        accountMnemoinc,
        usablePaymentMethod:
          userPaymentMethod || determinePaymentMethodRef.current,
        bitcoinBalance,
        dollarBalanceSat,
        convertedSendAmount: convertedSendAmountRef.current,
        poolInfoRef,
        swapLimits,
        min_usd_swap_amount,
        primaryDisplay: primaryDisplayRef.current,
        conversionFiatStats: conversionFiatStatsRef.current,
        openOverlay,
      });
      setIsDecoding(false);
    }
    if (!sparkInformation.didConnect || !sparkInformation.identityPubKey)
      return;
    if (isSendingPayment.current) return;
    if (didDecode.current) return;
    didDecode.current = true;
    decodePayment();
  }, [
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    refreshDecode,
  ]);

  useEffect(() => {
    if (
      !isUsingFastPay ||
      hasTriggeredFastPay.current ||
      isSendingPayment.current
    )
      return;

    setShowProgressAnimation(true);

    const fastPayTrigger = setTimeout(() => {
      hasTriggeredFastPay.current = true;
      sendPayment();
    }, 250);

    return () => clearTimeout(fastPayTrigger);
  }, [isUsingFastPay]);

  const publishMessageFuncForContact = useCallback(
    (txid) => {
      const UUID = customUUID();
      const sendObject = {
        amountMsat: convertedSendAmountRef.current * 1000,
        uuid: UUID,
        wasSeen: null,
        didSend: null,
        isRedeemed: null,
        description: combinedPaymentDescription || "",
        isRequest: false,
        paymentDenomination: inputDenominationRef.current || "BTC",
        amountDollars:
          inputDenominationRef.current === "USD"
            ? satsToDollars(
                convertedSendAmount,
                poolInfoRef.currentPriceAInB,
              ).toFixed(2)
            : null,
        ...(globalContactsInformation.myProfile?.uniqueName
          ? {
              senderProfileSnapshot: {
                uniqueName: globalContactsInformation.myProfile.uniqueName,
              },
            }
          : {}),
      };
      publishMessage({
        toPubKey: selectedContact.uuid,
        fromPubKey: globalContactsInformation.myProfile.uuid,
        data: {
          ...sendObject,
          txid,
          name:
            globalContactsInformation.myProfile?.name ||
            globalContactsInformation.myProfile?.uniqueName,
        },
        globalContactsInformation,
        selectedContact,
        isLNURLPayment: selectedContact?.isLNURL,
        privateKey: contactsPrivateKey,
        retrivedContact,
        currentTime: Date.now(),
        masterInfoObject,
      });
    },
    [
      selectedContact,
      retrivedContact,
      globalContactsInformation,
      contactsPrivateKey,
      masterInfoObject,
      combinedPaymentDescription,
    ],
  );

  const effectivePublishMessageFunc =
    paymentInfo?.publishMessageFuncParms ||
    publishMessageFuncParms ||
    (selectedContact ? publishMessageFuncForContact : null);

  const sendPayment = useCallback(async () => {
    if (!paymentValidation.isValid) {
      const error = paymentValidation.getErrorMessage(
        paymentValidation.primaryError,
      );
      openOverlay({ for: "error", errorMessage: error });
      return;
    }

    if (isSendingPayment.current) return;
    isSendingPayment.current = true;
    setShowProgressAnimation(true);

    try {
      const formattedSparkPaymentInfo = formatSparkPaymentAddress(
        paymentInfo,
        selectedLRC20Asset?.toLowerCase() !== "bitcoin",
      );

      const memo =
        paymentInfo.type === InputTypes.BOLT11
          ? enteredPaymentInfo?.description || combinedPaymentDescription
          : combinedPaymentDescription || enteredPaymentInfo?.description;

      const paymentObject = {
        getFee: false,
        ...formattedSparkPaymentInfo,
        isUsingLRC20,
        amountSats: isUsingLRC20
          ? paymentInfo?.sendAmount * 10 ** tokenDecimals
          : convertedSendAmount,
        masterInfoObject,
        fee: paymentFee,
        memo,
        userBalance: bitcoinBalance,
        sparkInformation: sparkInfoRef.current,
        feeQuote: paymentInfo.feeQuote,
        swapPaymentQuote: paymentInfo.swapPaymentQuote,
        usingZeroAmountInvoice: paymentInfo.usingZeroAmountInvoice,
        seletctedToken: selectedLRC20Asset,
        mnemonic: currentWalletMnemoinc,
        sendWebViewRequest: null,
        contactInfo,
        fromMainSendScreen: true,
        usablePaymentMethod: resolvedPaymentMethod,
        paymentInfo,
        fiatValueConvertedSendAmount,
        poolInfoRef,
      };

      const paymentResponse = await sparkPaymenWrapper(paymentObject);

      if (paymentResponse.shouldSave) {
        let retries = 0;
        const maxRetries = 20;
        while (!sparkInfoRef.current.identityPubKey && retries < maxRetries) {
          await new Promise((res) => setTimeout(res, 500));
          retries++;
        }
        if (sparkInfoRef.current.identityPubKey) {
          const tx = {
            ...paymentResponse.response,
            accountId: sparkInfoRef.current.identityPubKey,
          };
          await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", 0);
        } else {
          console.error("Failed to get identityPubKey after waiting");
        }
        isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, false);
      }

      if (paymentResponse.didWork) {
        if (fromPage?.includes("contacts") && paymentResponse.response?.id) {
          if (fromPage === "contacts-request") {
            handlePaymentUpdate({
              transaction: params.publishMessageFuncParams?.transaction,
              didPay: params.publishMessageFuncParams?.didPay,
              txid: paymentResponse.response?.id,
              globalContactsInformation:
                params.publishMessageFuncParams?.globalContactsInformation,
              selectedContact: params.publishMessageFuncParams?.selectedContact,
              currentTime: params.publishMessageFuncParams?.currentTime,
              contactsPrivateKey,
              publicKey,
              masterInfoObject,
            });
          } else if (params.publishMessageFuncParams) {
            const sendObject = params.publishMessageFuncParams;
            sendObject.data.txid = paymentResponse.response?.id;
            publishMessage(sendObject);
          } else if (selectedContact) {
            effectivePublishMessageFunc(paymentResponse.response.id);
          }
        }
        navigate("/confirm-page", {
          state: {
            for: "paymentsucceed",
            transaction: paymentResponse.response,
            lnurlAddress:
              paymentInfo?.type === InputTypes.LNURL_PAY
                ? normalizeLNURLAddress(paymentInfo?.data?.address)
                : undefined,
            blitzContactInfo: paymentInfo?.blitzContactInfo,
          },
          replace: true,
        });
      } else {
        navigate("/confirm-page", {
          state: {
            for: "paymentfailed",
            transaction: {
              paymentStatus: "failed",
              details: {
                error: paymentResponse.error,
                transaction: paymentResponse.response,
                lnurlAddress:
                  paymentInfo?.type === InputTypes.LNURL_PAY
                    ? normalizeLNURLAddress(paymentInfo?.data?.address)
                    : undefined,
                blitzContactInfo: paymentInfo?.blitzContactInfo,
              },
            },
          },
          replace: true,
        });
      }
    } catch (err) {
      console.error("Payment send error:", err);
      isSendingPayment.current = false;
      setShowProgressAnimation(false);
      errorMessageNavigation(err.message);
    }
  }, [
    paymentValidation,
    paymentInfo,
    selectedLRC20Asset,
    enteredPaymentInfo,
    combinedPaymentDescription,
    isUsingLRC20,
    tokenDecimals,
    convertedSendAmount,
    masterInfoObject,
    paymentFee,
    bitcoinBalance,
    sparkInfoRef,
    currentWalletMnemoinc,
    contactInfo,
    fromPage,
    effectivePublishMessageFunc,
    navigate,
    errorMessageNavigation,
    resolvedPaymentMethod,
    fiatValueConvertedSendAmount,
    poolInfoRef,
    params,
    contactsPrivateKey,
    publicKey,
    selectedContact,
    openOverlay,
  ]);

  const handleSelectPaymentMethod = useCallback(
    (showNextScreen) => {
      if (showNextScreen) {
        if (!paymentValidation.isValid) {
          openOverlay({
            for: "error",
            errorMessage: paymentValidation.getErrorMessage(
              paymentValidation.primaryError,
            ),
          });
          return;
        }
        setDidSelectPaymentMethod(true);
      } else {
        openOverlay({
          for: "halfModal",
          contentType: "SelectPaymentMethod",
          params: {
            selectedPaymentMethod: resolvedPaymentMethod,
            onSelect: (method) => {
              navigate(location.pathname, {
                state: { ...params, selectedPaymentMethod: method },
                replace: true,
              });
            },
          },
        });
      }
    },
    [
      navigate,
      openOverlay,
      paymentValidation,
      resolvedPaymentMethod,
      params,
      location.pathname,
    ],
  );

  const handleSelectTokenPress = useCallback(() => {
    openOverlay({
      for: "halfModal",
      contentType: "SelectLRC20Token",
      params: {
        sparkInformation,
        onSelect: (token) => {
          navigate(location.pathname, {
            state: { ...params, masterTokenInfo: token },
            replace: true,
          });
        },
      },
    });
  }, [openOverlay, sparkInformation, navigate, location.pathname, params]);

  const handleEmoji = (newDescription) => {
    setPaymentDescription(newDescription);
  };

  const handleDenominationToggle = () => {
    if (!isAmountFocused) return;
    if (!canEditAmount) {
      const nextDenom = getNextDenomination();
      setUserSetInputDenomination(nextDenom);
    } else {
      const nextDenom = getNextDenomination();
      const convertedValue = convertForToggle(
        sendingAmount,
        convertTextInputValue,
      );
      setUserSetInputDenomination(nextDenom);
      setPaymentInfo((prev) => ({ ...prev, sendAmount: convertedValue }));
    }
  };

  const sendingAsset =
    selectedLRC20Asset === "Bitcoin"
      ? !isLightningPayment &&
        !isBitcoinPayment &&
        !(isSparkPayment && receiverExpectsCurrency === "sats")
        ? t("constants.dollars_upper")
        : t("constants.bitcoin_upper")
      : seletctedToken?.tokenMetadata?.tokenTicker;

  if (
    (!Object.keys(paymentInfo).length && !globalError) ||
    !sparkInformation.didConnect
  ) {
    return (
      <>
        {!sparkInformation.didConnect && <CustomSettingsNavbar />}
        <FullLoadingScreen text={loadingMessage} />
      </>
    );
  }

  if (globalError) {
    return <ErrorWithPayment reason={globalError} />;
  }

  return (
    <div className="sendContainer">
      <PageNavBar text={t("constants.send")} />
      <ThemeText className="sendingAssetTitle" textContent={sendingAsset} />

      <div className="paymentInfoContainer">
        {uiState !== "SWAP_RATES_CHANGED" && (
          <div
            className="balanceContainer"
            onClick={handleDenominationToggle}
            style={{ cursor: "pointer" }}
          >
            <FormattedBalanceInput
              amountValue={displayAmount}
              inputDenomination={primaryDisplay.denomination}
              forceCurrency={primaryDisplay.forceCurrency}
              forceFiatStats={primaryDisplay.forceFiatStats}
              activeOpacity={!sendingAmount ? HIDDEN_OPACITY : 1}
              maxWidth={0.9}
              customCurrencyCode={
                isUsingLRC20 ? seletctedToken?.tokenMetadata?.tokenTicker : ""
              }
              maxDecimals={isUsingLRC20 ? tokenDecimals : 2}
            />
            {!isUsingLRC20 && (
              <FormattedSatText
                containerStyles={{
                  opacity: !sendingAmount ? HIDDEN_OPACITY : 1,
                }}
                neverHideBalance={true}
                styles={{ margin: 0 }}
                globalBalanceDenomination={secondaryDisplay.denomination}
                forceCurrency={secondaryDisplay.forceCurrency}
                balance={convertedSendAmount}
                forceFiatStats={secondaryDisplay.forceFiatStats}
              />
            )}
          </div>
        )}

        {uiState === "CONFIRM_PAYMENT" && (
          <>
            <SendTransactionFeeInfo
              paymentFee={paymentFee}
              isLightningPayment={isLightningPayment}
              isLiquidPayment={isLiquidPayment}
              isBitcoinPayment={isBitcoinPayment}
              isSparkPayment={isSparkPayment}
              isDecoding={isDecoding}
            />
            <InvoiceInfo
              paymentInfo={paymentInfo}
              contactInfo={contactInfo || paymentInfo?.blitzContactInfo}
              fromPage={
                fromPage || (paymentInfo?.blitzContactInfo ? "contacts" : "")
              }
              theme={theme}
              darkModeType={darkModeType}
            />
          </>
        )}

        {uiState === "CHOOSE_METHOD" && (
          <ChoosePaymentMethod
            theme={theme}
            darkModeType={darkModeType}
            determinePaymentMethod={resolvedPaymentMethod}
            handleSelectPaymentMethod={handleSelectPaymentMethod}
            bitcoinBalance={bitcoinBalance}
            dollarBalanceToken={dollarBalanceToken}
            masterInfoObject={masterInfoObject}
            fiatStats={fiatStats}
            uiState={uiState}
            t={t}
          />
        )}

        {uiState === "SWAP_RATES_CHANGED" && <SwapRatesChangedState />}
      </div>

      {uiState === "EDIT_AMOUNT" && (
        <div className="editAmountContainer">
          <div className="choseMethodContainer">
            {enabledLRC20 &&
            paymentInfo.type === "spark" &&
            canEditAmount &&
            useFullTokensDisplay ? (
              <ChooseLRC20TokenContainer
                theme={theme}
                darkModeType={darkModeType}
                handleSelectPaymentMethod={handleSelectTokenPress}
                bitcoinBalance={bitcoinBalance}
                dollarBalanceToken={dollarBalanceToken}
                masterInfoObject={masterInfoObject}
                fiatStats={fiatStats}
                uiState={uiState}
                seletctedToken={seletctedToken}
                selectedLRC20Asset={selectedLRC20Asset}
                t={t}
              />
            ) : (
              <ChoosePaymentMethod
                theme={theme}
                darkModeType={darkModeType}
                determinePaymentMethod={resolvedPaymentMethod}
                handleSelectPaymentMethod={handleSelectPaymentMethod}
                bitcoinBalance={bitcoinBalance}
                dollarBalanceToken={dollarBalanceToken}
                masterInfoObject={masterInfoObject}
                fiatStats={fiatStats}
                uiState={uiState}
                t={t}
                showBitcoinCardOnly={isBTCOnlyPayment}
              />
            )}
          </div>

          <CustomInput
            onchange={setPaymentDescription}
            placeholder={t("constants.paymentDescriptionPlaceholder")}
            value={combinedPaymentDescription}
            containerClassName="customTextInputContinaerStyles"
            onFocus={() => setIsAmountFocused(false)}
            onBlur={() => setIsAmountFocused(true)}
            maxLength={paymentInfo?.data?.commentAllowed || 150}
          />

          {isAmountFocused && (
            <>
              <NumberInputSendPage
                paymentInfo={paymentInfo}
                setPaymentInfo={setPaymentInfo}
                fiatStats={conversionFiatStats}
                selectedLRC20Asset={selectedLRC20Asset}
                seletctedToken={seletctedToken}
                inputDenomination={inputDenomination}
                primaryDisplay={primaryDisplay}
              />
              <AcceptButtonSendPage
                decodeSendAddress={decodeSendAddress}
                errorMessageNavigation={errorMessageNavigation}
                btcAdress={btcAdress}
                paymentInfo={paymentInfo}
                convertedSendAmount={convertedSendAmount}
                paymentDescription={combinedPaymentDescription}
                setPaymentInfo={setPaymentInfo}
                setLoadingMessage={setLoadingMessage}
                fromPage={fromPage}
                sparkInformation={sparkInformation}
                seletctedToken={seletctedToken}
                useAltLayout={false}
                globalContactsInformation={globalContactsInformation}
                canUseFastPay={canUseFastPay}
                selectedPaymentMethod={resolvedPaymentMethod}
                bitcoinBalance={bitcoinBalance}
                dollarBalanceSat={dollarBalanceSat}
                isDecoding={isDecoding || isEstimatingFee}
                poolInfoRef={poolInfoRef}
                swapLimits={swapLimits}
                min_usd_swap_amount={min_usd_swap_amount}
                inputDenomination={inputDenomination}
                paymentValidation={paymentValidation}
                setDidSelectPaymentMethod={setDidSelectPaymentMethod}
                conversionFiatStats={conversionFiatStats}
                primaryDisplay={primaryDisplay}
              />
            </>
          )}
        </div>
      )}

      {uiState === "CHOOSE_METHOD" && (
        <CustomButton
          buttonStyles={{
            opacity: paymentValidation.isValid ? 1 : HIDDEN_OPACITY,
          }}
          actionFunction={() => handleSelectPaymentMethod(true)}
          textContent={t("constants.review")}
        />
      )}

      {uiState === "SWAP_RATES_CHANGED" && (
        <CustomButton
          actionFunction={handleRateChangedReset}
          textContent={t(
            "wallet.sendPages.sendPaymentScreen.swapRatesChangedButton",
          )}
        />
      )}

      {uiState === "CONFIRM_PAYMENT" && (
        <div className="buttonContainer">
          {showProgressAnimation || isUsingFastPay ? (
            <div className="progressAnimation">
              <ThemeText
                textStyles={{ opacity: 0.7 }}
                textContent={
                  t("wallet.sendPages.sendPaymentScreen.sending") ||
                  "Sending..."
                }
              />
            </div>
          ) : (
            <SwipeButton
              disabled={!canSendPayment}
              onSwipeSuccess={sendPayment}
              containerStyles={{ opacity: canSendPayment ? 1 : HIDDEN_OPACITY }}
            />
          )}
        </div>
      )}

      {!isAmountFocused && uiState === "EDIT_AMOUNT" && (
        <EmojiQuickBar
          description={combinedPaymentDescription}
          onEmojiSelect={handleEmoji}
        />
      )}
    </div>
  );
}
