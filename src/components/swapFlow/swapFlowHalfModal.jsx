import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Bitcoin,
  DollarSign,
  ArrowLeft,
  ArrowDownUp,
  History,
  Info,
  Check,
} from "lucide-react";
import Lottie from "react-lottie-player";
import confirmTxAnimation from "../../assets/confirmTxAnimation.json";
import { updateConfirmAnimation } from "../../functions/lottieViewColorTransformer";
import {
  findBestPool,
  simulateSwap,
  swapBitcoinToToken,
  swapTokenToBitcoin,
  handleFlashnetError,
  BTC_ASSET_ADDRESS,
  USD_ASSET_ADDRESS,
  getUserSwapHistory,
  satsToDollars,
  dollarsToSats,
  INTEGRATOR_FEE,
  currentPriceAinBToPriceDollars,
} from "../../functions/spark/flashnet";
import { bulkUpdateSparkTransactions } from "../../functions/spark/transactions";
import { useFlashnet } from "../../contexts/flashnetContext";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { useSpark } from "../../contexts/sparkContext";
import { useAppStatus } from "../../contexts/appStatus";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import { useThemeContext } from "../../contexts/themeContext";
import { useOverlay } from "../../contexts/overlayContext";
import useThemeColors from "../../hooks/useThemeColors";
import CustomNumberKeyboard from "../customNumberKeyboard/customNumberKeyboard";
import CustomButton from "../customButton/customButton";
import ThemeText from "../themeText/themeText";
import { USDB_TOKEN_ID } from "../../constants";
import { getTimeDisplay } from "../../functions/contacts";
import formatBalanceAmount from "../../functions/formatNumber";
import "./swapFlowHalfModal.css";
import FullLoadingScreen from "../fullLoadingScreen/fullLoadingScreen";
import { Colors } from "../../constants/theme";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";

const APPROXIMATE_SYMBOL = "≈";

const SLIPPAGE_OPTIONS = ["0.1", "0.5", "1", "3", "5"];

function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  );
}

function customUUID() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function formatAmountDisplay(amount, asset) {
  if (!amount || amount === "0") return "0";
  const num = parseFloat(amount);
  if (isNaN(num)) return "0";
  if (asset === "BTC") return num.toLocaleString() + " sats";
  return "$" + num.toFixed(2);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = Math.abs(now - date);
  const mins = diffMs / 60000;
  const hrs = diffMs / 3600000;
  const days = diffMs / 86400000;
  const yrs = diffMs / (86400000 * 365);
  return getTimeDisplay(mins, hrs, days, yrs);
}

export default function SwapFlowHalfModal({ onClose, setContentHeight }) {
  const { t } = useTranslation();
  const {
    poolInfo: globalPoolInfo,
    togglePoolInfo,
    swapUSDPriceDollars,
    swapLimits,
  } = useFlashnet();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { sparkInformation } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
  const { openOverlay } = useOverlay();

  // USD token info
  const tokenInformation = sparkInformation?.tokens?.[USDB_TOKEN_ID];
  const tokenDecimals = tokenInformation?.tokenMetadata?.decimals || 6;
  const btcBalance = sparkInformation?.balance || 0;
  const dollarBalanceToken =
    (tokenInformation?.balance || 0) / Math.pow(10, tokenDecimals);

  // Step state
  const [currentStep, setCurrentStep] = useState("routeSelection");
  const [stepStyle, setStepStyle] = useState({
    opacity: 1,
    transform: "translateX(0px)",
  });

  const HEIGHT_FOR_STEP = useMemo(
    () => ({
      routeSelection: "525px",
      historyExpanded: "100%",
      amountInput: "725px",
      review: "100%",
      confirmation: "525px",
    }),
    [],
  );

  useEffect(() => {
    if (setContentHeight) {
      setContentHeight(HEIGHT_FOR_STEP[currentStep]);
    }
  }, [currentStep]);

  // Swap state
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromAsset, setFromAsset] = useState("BTC");
  const [toAsset, setToAsset] = useState("USD");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [poolInfo, setPoolInfo] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [error, setError] = useState(null);
  const [priceImpact, setPriceImpact] = useState(null);
  const [confirmedSwap, setConfirmedSwap] = useState(null);
  const [lastEditedField, setLastEditedField] = useState("from");
  const [slippagePercent, setSlippagePercent] = useState("");
  const [activePercentage, setActivePercentage] = useState(null);
  const [showPriceImpactWarning, setShowPriceImpactWarning] = useState(false);

  // History state
  const [swapHistory, setSwapHistory] = useState({ swaps: [], totalCount: 0 });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [finishedInitialHistoryLoad, setFinishedInitialHistoryLoad] =
    useState(false);

  const currentRequetId = useRef(null);
  const lastSimulatedAmount = useRef(null);
  const isPillPressRef = useRef(false);
  const lottieRef = useRef(null);

  const confirmAnimation = useMemo(
    () =>
      updateConfirmAnimation(
        confirmTxAnimation,
        theme ? (darkModeType ? "lightsOut" : "dark") : "light",
      ),
    [theme, darkModeType],
  );

  const navigateToStep = useCallback((newStep, dir = "forward") => {
    const offset = dir === "forward" ? 30 : -30;
    setStepStyle({ opacity: 0, transform: `translateX(${offset}px)` });
    setTimeout(() => {
      setCurrentStep(newStep);
      setStepStyle({ opacity: 1, transform: "translateX(0px)" });
    }, 150);
  }, []);

  // Derived state
  const hasEnoughBalance =
    (fromAsset === "BTC" && Number(fromAmount) <= btcBalance) ||
    (fromAsset === "USD" && Number(fromAmount) <= dollarBalanceToken);

  const bitcoinBalanceIsAboveSwapLimit = btcBalance >= swapLimits.bitcoin;
  const dollarBalanceIsAboveSwapLimit = dollarBalanceToken >= swapLimits.usd;

  const canSwap =
    fromAmount &&
    parseFloat(fromAmount) > 0 &&
    toAmount &&
    parseFloat(toAmount) > 0 &&
    !isSimulating &&
    !isSwapping &&
    !isLoadingPool &&
    poolInfo &&
    !error &&
    hasEnoughBalance;

  // Pool loading
  useEffect(() => {
    if (!sparkInformation.didConnectToFlashnet) return;
    if (globalPoolInfo && Object.keys(globalPoolInfo).length) {
      setPoolInfo(globalPoolInfo);
      setIsLoadingPool(false);
    } else {
      loadPoolInfo();
    }
  }, [sparkInformation.didConnectToFlashnet]);

  const loadPoolInfo = async () => {
    setIsLoadingPool(true);
    setError(null);
    try {
      const result = await findBestPool(
        currentWalletMnemoinc,
        BTC_ASSET_ADDRESS,
        USD_ASSET_ADDRESS,
      );
      if (result.didWork && result.pool) {
        setPoolInfo(result.pool);
        togglePoolInfo(result.pool);
      } else {
        openOverlay({
          for: "error",
          errorMessage: t("screens.inAccount.swapsPage.noPoolFoundBackup"),
        });
      }
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.loadPoolError"),
      });
    } finally {
      setIsLoadingPool(false);
    }
  };

  const clearPageStates = () => {
    setFromAmount("");
    setToAmount("");
    setSimulationResult(null);
    setPriceImpact(null);
    setError(null);
    setLastEditedField("from");
    setConfirmedSwap(null);
    setActivePercentage(null);
  };

  // History loading
  useEffect(() => {
    if (currentStep !== "historyExpanded") return;
    if (finishedInitialHistoryLoad) return;
    loadSwapHistory();
  }, [currentStep]);

  const loadSwapHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await getUserSwapHistory(currentWalletMnemoinc, 20);
      if (result.didWork) {
        setSwapHistory({ swaps: result.swaps, totalCount: result.totalCount });
      }
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: t(
          "screens.inAccount.swapHistory.loadingSwapHistoryError",
        ),
      });
    } finally {
      setIsLoadingHistory(false);
      setFinishedInitialHistoryLoad(true);
    }
  };

  const loadMoreHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const result = await getUserSwapHistory(
        currentWalletMnemoinc,
        20,
        swapHistory.swaps.length,
      );
      if (result.didWork) {
        setSwapHistory((prev) => ({
          swaps: [...prev.swaps, ...result.swaps],
          totalCount: result.totalCount,
        }));
      }
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: t(
          "screens.inAccount.swapHistory.loadingSwapHistoryError",
        ),
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Simulation
  const _simulateSwapAmount = useCallback(
    async (amount, direction, uuid) => {
      if (!poolInfo) return;
      if (uuid !== currentRequetId.current) return;
      if (!amount) {
        setError("");
        return;
      }
      setIsSimulating(true);
      setError(null);

      try {
        const isBtcToUsdb = fromAsset === "BTC";
        const decimals = tokenDecimals;
        const isForward = direction === "from";

        let amountInSmallestUnits, assetInAddress, assetOutAddress;
        if (isForward) {
          amountInSmallestUnits = isBtcToUsdb
            ? Math.floor(parseFloat(amount))
            : Math.floor(parseFloat(amount) * Math.pow(10, decimals));
          assetInAddress = isBtcToUsdb ? BTC_ASSET_ADDRESS : USD_ASSET_ADDRESS;
          assetOutAddress = isBtcToUsdb ? USD_ASSET_ADDRESS : BTC_ASSET_ADDRESS;
        } else {
          amountInSmallestUnits = isBtcToUsdb
            ? Math.floor(parseFloat(amount) * Math.pow(10, decimals))
            : Math.floor(parseFloat(amount));
          assetInAddress = isBtcToUsdb ? USD_ASSET_ADDRESS : BTC_ASSET_ADDRESS;
          assetOutAddress = isBtcToUsdb ? BTC_ASSET_ADDRESS : USD_ASSET_ADDRESS;
        }

        const result = await simulateSwap(currentWalletMnemoinc, {
          poolId: poolInfo.lpPublicKey,
          assetInAddress,
          assetOutAddress,
          amountIn: amountInSmallestUnits,
        });

        if (uuid !== currentRequetId.current) return;

        if (result.didWork && result.simulation) {
          setSimulationResult(result.simulation);
          const impact = parseFloat(result.simulation.priceImpact);
          setPriceImpact(impact);

          let outputAmount;
          if (isForward) {
            outputAmount = isBtcToUsdb
              ? (
                  parseFloat(result.simulation.expectedOutput) /
                  Math.pow(10, decimals)
                ).toFixed(2)
              : parseFloat(result.simulation.expectedOutput).toFixed(0);
            setToAmount(outputAmount);
          } else {
            outputAmount = isBtcToUsdb
              ? parseFloat(result.simulation.expectedOutput).toFixed(0)
              : (
                  parseFloat(result.simulation.expectedOutput) /
                  Math.pow(10, decimals)
                ).toFixed(2);
            setFromAmount(outputAmount);
          }

          if (impact > 3) {
            openOverlay({
              for: "error",
              errorMessage: t("screens.inAccount.swapsPage.highPriceImpact", {
                priceImpact: result.simulation.priceImpact,
              }),
            });
          }
        } else {
          const errorInfo = handleFlashnetError({
            ...result.details,
            error: result.error,
          });
          setError(true);
          if (isForward) setToAmount("0");
          else setFromAmount("0");
        }
      } catch (err) {
        setError(true);
        if (direction === "from") setToAmount("0");
        else setFromAmount("0");
      } finally {
        setIsSimulating(false);
      }
    },
    [poolInfo, fromAsset, tokenDecimals, currentWalletMnemoinc, t, openOverlay],
  );

  const simulateSwapAmount = useDebounce(_simulateSwapAmount, 500);

  useEffect(() => {
    const uuid = customUUID();
    currentRequetId.current = uuid;
    if (lastEditedField === "from") {
      if (
        fromAmount.length &&
        !isNaN(fromAmount) &&
        parseFloat(fromAmount) > 0
      ) {
        if (lastSimulatedAmount.current === fromAmount && !!toAmount.length)
          return;
        lastSimulatedAmount.current = fromAmount;
        simulateSwapAmount(fromAmount, "from", uuid);
      } else {
        setToAmount("");
        setSimulationResult(null);
        setPriceImpact(null);
        setError("");
      }
    } else if (lastEditedField === "to") {
      if (toAmount.length && !isNaN(toAmount) && parseFloat(toAmount) > 0) {
        if (lastSimulatedAmount.current === toAmount && fromAmount) return;
        lastSimulatedAmount.current = toAmount;
        simulateSwapAmount(toAmount, "to", uuid);
      } else {
        setFromAmount("");
        setSimulationResult(null);
        setPriceImpact(null);
        setError("");
      }
    }
  }, [fromAmount, toAmount, fromAsset, toAsset, poolInfo, lastEditedField]);

  // Handlers
  const handleSelectFromAsset = (newFrom) => {
    if (fromAsset === newFrom) return;
    setFromAsset(newFrom);
    setToAsset(newFrom === "BTC" ? "USD" : "BTC");
    setFromAmount("");
    setToAmount("");
    setSimulationResult(null);
    setActivePercentage(null);
  };

  const handleFromAmountChange = (value, direction) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      if (!isPillPressRef.current) setActivePercentage(null);
      isPillPressRef.current = false;
      if (direction === "from") {
        setFromAmount(value);
        setLastEditedField("from");
      } else {
        setToAmount(value);
        setLastEditedField("to");
      }
    }
  };

  const setPercentage = (percent) => {
    const balance = fromAsset === "BTC" ? btcBalance : dollarBalanceToken;
    const decimals = fromAsset === "BTC" ? 0 : 2;
    const multiplier = Math.pow(10, decimals);
    const amount = (Math.floor(balance * percent * multiplier) / multiplier)
      .toFixed(decimals)
      .toString();
    setFromAmount(amount);
    setLastEditedField("from");
  };

  const executeSwapAction = async () => {
    if (!canSwap) {
      navigateToStep("routeSelection", "backward");
      return;
    }
    if (!poolInfo || !fromAmount || parseFloat(fromAmount) <= 0) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.invalidAmount"),
      });
      return;
    }
    if (fromAsset === "BTC" && Number(fromAmount) < swapLimits.bitcoin) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.minBTCError", {
          min: `${swapLimits.bitcoin} sats`,
        }),
      });
      return;
    }
    if (fromAsset === "USD" && Number(fromAmount) < swapLimits.usd) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.minUSDError", {
          min: `$${swapLimits.usd}`,
        }),
      });
      return;
    }
    if (isSimulating) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.simulationInProgress"),
      });
      return;
    }
    if (!hasEnoughBalance) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.insufficientBalance"),
      });
      return;
    }
    if (!simulationResult || !Object.keys(simulationResult).length) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.simulationError"),
      });
      return;
    }
    if (isSwapping) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.swapInProgressError"),
      });
      return;
    }

    if (lastEditedField === "to") {
      setIsSimulating(true);
      setError(null);
      try {
        const isBtcToUsdb = fromAsset === "BTC";
        const decimals = tokenDecimals;
        const amountInSmallestUnits = isBtcToUsdb
          ? Math.floor(parseFloat(fromAmount))
          : Math.floor(parseFloat(fromAmount) * Math.pow(10, decimals));
        const assetInAddress = isBtcToUsdb
          ? BTC_ASSET_ADDRESS
          : USD_ASSET_ADDRESS;
        const assetOutAddress = isBtcToUsdb
          ? USD_ASSET_ADDRESS
          : BTC_ASSET_ADDRESS;
        const uuid = customUUID();
        currentRequetId.current = uuid;
        const result = await simulateSwap(currentWalletMnemoinc, {
          poolId: poolInfo.lpPublicKey,
          assetInAddress,
          assetOutAddress,
          amountIn: amountInSmallestUnits,
        });
        if (uuid !== currentRequetId.current) {
          setIsSimulating(false);
          return;
        }
        if (result.didWork && result.simulation) {
          setSimulationResult(result.simulation);
          const impact = parseFloat(result.simulation.priceImpact);
          setPriceImpact(impact);
          const outputAmount = isBtcToUsdb
            ? (
                parseFloat(result.simulation.expectedOutput) /
                Math.pow(10, decimals)
              ).toFixed(2)
            : parseFloat(result.simulation.expectedOutput).toFixed(0);
          lastSimulatedAmount.current = fromAmount;
          setLastEditedField("from");
          setToAmount(outputAmount);
          if (impact > 3) {
            openOverlay({
              for: "error",
              errorMessage: t("screens.inAccount.swapsPage.highPriceImpact", {
                priceImpact: result.simulation.priceImpact,
              }),
            });
            setIsSimulating(false);
            return;
          }
          setIsSimulating(false);
          navigateToStep("review", "forward");
        } else {
          const errorInfo = handleFlashnetError({
            ...result.details,
            error: result.error,
          });
          setError(true);
          setIsSimulating(false);
          openOverlay({
            for: "error",
            errorMessage:
              errorInfo.userMessage ||
              result.error ||
              t("screens.inAccount.swapsPage.simulationError"),
          });
        }
      } catch (err) {
        setError(true);
        setIsSimulating(false);
        openOverlay({
          for: "error",
          errorMessage: t("screens.inAccount.swapsPage.simulationError"),
        });
      }
    } else {
      navigateToStep("review", "forward");
    }
  };

  const handleAcceptReview = () => {
    if (priceImpact > 5) {
      setShowPriceImpactWarning(true);
      return;
    }
    performSwap();
  };

  const performSwap = async () => {
    setIsSwapping(true);
    setShowPriceImpactWarning(false);
    setError(null);

    try {
      const isBtcToUsdb = fromAsset === "BTC";
      const decimals = tokenDecimals;
      const amountInSmallestUnits = isBtcToUsdb
        ? Math.floor(parseFloat(fromAmount))
        : Math.floor(parseFloat(fromAmount) * Math.pow(10, decimals));

      console.log(
        currentWalletMnemoinc,
        USD_ASSET_ADDRESS,
        amountInSmallestUnits,
        poolInfo,
        (slippagePercent || 5) * 100,
      );
      const result = isBtcToUsdb
        ? await swapBitcoinToToken(currentWalletMnemoinc, {
            tokenAddress: USD_ASSET_ADDRESS,
            amountSats: amountInSmallestUnits,
            poolId: poolInfo.lpPublicKey,
            maxSlippageBps: (slippagePercent || 5) * 100,
          })
        : await swapTokenToBitcoin(currentWalletMnemoinc, {
            tokenAddress: USD_ASSET_ADDRESS,
            tokenAmount: amountInSmallestUnits,
            poolId: poolInfo.lpPublicKey,
            maxSlippageBps: (slippagePercent || 5) * 100,
          });

      if (result.didWork && result.swap) {
        const realReceivedAmount = isBtcToUsdb
          ? dollarsToSats(
              result.swap.amountOut / Math.pow(10, decimals),
              result.swap.executionPrice,
            )
          : parseFloat(result.swap.amountOut).toFixed(0);
        const realFeeAmount = Math.round(
          dollarsToSats(
            parseFloat(result.swap.feeAmount) / Math.pow(10, decimals),
            result.swap.executionPrice,
          ),
        );

        setConfirmedSwap({ ...result.swap, realReceivedAmount, realFeeAmount });
        navigateToStep("confirmation", "forward");

        const userSwaps = await getUserSwapHistory(currentWalletMnemoinc, 5);
        const swap = userSwaps.swaps?.find(
          (s) => s.outboundTransferId === result.swap.outboundTransferId,
        );

        if (swap) {
          let incomingTransfer, outgoingTransfer;
          if (isBtcToUsdb) {
            incomingTransfer = {
              id: swap.outboundTransferId,
              paymentStatus: "completed",
              paymentType: "spark",
              accountId: sparkInformation.identityPubKey,
              details: {
                fee: realFeeAmount,
                totalFee: realFeeAmount,
                supportFee: 0,
                amount: parseFloat(result.swap.amountOut),
                description: t(
                  "screens.inAccount.swapsPage.paymentDescription_incoming",
                  {
                    swapDirection: t(
                      "screens.inAccount.swapsPage.swapDirection_btcusd",
                    ),
                  },
                ),
                address: sparkInformation.sparkAddress,
                time: Date.now(),
                createdAt: Date.now(),
                direction: "INCOMING",
                isLRC20Payment: true,
                LRC20Token: USDB_TOKEN_ID,
                showSwapLabel: true,
                currentPriceAInB: result.swap.executionPrice,
              },
            };
            outgoingTransfer = {
              id: swap.inboundTransferId,
              paymentStatus: "completed",
              paymentType: "spark",
              accountId: sparkInformation.identityPubKey,
              details: {
                fee: 0,
                totalFee: 0,
                supportFee: 0,
                amount: parseFloat(swap.amountIn),
                description: t(
                  "screens.inAccount.swapsPage.paymentDescription_outgoing",
                  {
                    swapDirection: t(
                      "screens.inAccount.swapsPage.swapDirection_btcusd",
                    ),
                  },
                ),
                address: sparkInformation.sparkAddress,
                time: Date.now(),
                createdAt: Date.now(),
                direction: "OUTGOING",
                showSwapLabel: true,
                currentPriceAInB: result.swap.executionPrice,
              },
            };
          } else {
            incomingTransfer = {
              id: swap.outboundTransferId,
              paymentStatus: "pending",
              paymentType: "spark",
              accountId: sparkInformation.identityPubKey,
              details: {
                fee: realFeeAmount,
                totalFee: realFeeAmount,
                supportFee: 0,
                amount: parseFloat(swap.amountOut),
                description: t(
                  "screens.inAccount.swapsPage.paymentDescription_incoming",
                  {
                    swapDirection: t(
                      "screens.inAccount.swapsPage.swapDirection_usdbtc",
                    ),
                  },
                ),
                address: sparkInformation.sparkAddress,
                time: Date.now(),
                createdAt: Date.now(),
                direction: "INCOMING",
                showSwapLabel: true,
                currentPriceAInB: result.swap.executionPrice,
              },
            };
            outgoingTransfer = {
              id: swap.inboundTransferId,
              paymentStatus: "completed",
              paymentType: "spark",
              accountId: sparkInformation.identityPubKey,
              details: {
                fee: 0,
                totalFee: 0,
                supportFee: 0,
                amount: parseFloat(swap.amountIn),
                description: t(
                  "screens.inAccount.swapsPage.paymentDescription_outgoing",
                  {
                    swapDirection: t(
                      "screens.inAccount.swapsPage.swapDirection_usdbtc",
                    ),
                  },
                ),
                address: sparkInformation.sparkAddress,
                time: Date.now(),
                createdAt: Date.now(),
                direction: "OUTGOING",
                isLRC20Payment: true,
                LRC20Token: USDB_TOKEN_ID,
                showSwapLabel: true,
                currentPriceAInB: result.swap.executionPrice,
              },
            };
          }
          bulkUpdateSparkTransactions(
            [incomingTransfer, outgoingTransfer],
            "fullUpdate",
          );
        }
      } else {
        const errorInfo = handleFlashnetError({
          ...result.details,
          error: result.error,
        });
        openOverlay({
          for: "error",
          errorMessage:
            errorInfo.userMessage ||
            result.error ||
            t("screens.inAccount.swapsPage.fullSwapError"),
        });
      }
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: t("screens.inAccount.swapsPage.fullSwapError"),
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Review computed values
  const isBtcToUsdbReview = fromAsset === "BTC";
  const reviewSwapFee = simulationResult
    ? isBtcToUsdbReview
      ? Number(simulationResult.feePaidAssetIn / 1000000)
      : dollarsToSats(
          simulationResult.feePaidAssetIn / 1000000,
          poolInfo?.currentPriceAInB,
        )
    : 0;
  const reviewLpFee =
    simulationResult && isBtcToUsdbReview
      ? (simulationResult.expectedOutput * INTEGRATOR_FEE) / 1000000
      : 0;
  const totalFee = reviewSwapFee + reviewLpFee;

  const reviewExchangeRate = poolInfo
    ? isBtcToUsdbReview
      ? `1 sat ${APPROXIMATE_SYMBOL} $${Number(
          satsToDollars(1, poolInfo.currentPriceAInB),
        ).toFixed(6)}`
      : `$1 ${APPROXIMATE_SYMBOL} ${Math.round(
          dollarsToSats(1, poolInfo.currentPriceAInB),
        ).toLocaleString()} sats`
    : "";

  const cardBg = theme && darkModeType ? backgroundColor : backgroundOffset;

  return (
    <div className="swap-flow-container">
      {/* Price impact warning inline dialog */}
      {showPriceImpactWarning && (
        <div
          className="swap-impact-overlay"
          onClick={() => setShowPriceImpactWarning(false)}
        >
          <div
            className="swap-impact-dialog"
            style={{ backgroundColor: cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            <ThemeText
              className="swap-impact-title"
              textContent={t("screens.inAccount.swapsPage.priceImpact", {
                impact: priceImpact?.toFixed(2) || "N/A",
              })}
            />
            <div className="swap-impact-buttons">
              <CustomButton
                textContent={t("constants.accept")}
                actionFunction={performSwap}
                buttonStyles={{ flex: 1 }}
              />
              <CustomButton
                textContent={t("constants.back")}
                actionFunction={() => setShowPriceImpactWarning(false)}
                buttonStyles={{
                  flex: 1,
                  backgroundColor: "transparent",
                  border: `1px solid ${textColor}`,
                }}
                textStyles={{ color: textColor }}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className="swap-step-wrapper"
        style={{
          opacity: stepStyle.opacity,
          transform: stepStyle.transform,
          transition: "opacity 0.15s ease, transform 0.15s ease",
        }}
      >
        {/* ── Step 1: Route Selection ───────────────────────────────── */}
        {currentStep === "routeSelection" && (
          <div className="swap-step-content">
            {isLoadingPool && (
              <div className="swap-loading-container">
                <ThemeText
                  removeMargin={true}
                  className="swap-loading-text"
                  textContent={t("screens.inAccount.swapsPage.loadingPool")}
                />
              </div>
            )}

            {!isLoadingPool && !poolInfo && (
              <div className="swap-error-state">
                <ThemeText
                  removeMargin={true}
                  className="swap-error-title"
                  textContent={t(
                    "screens.inAccount.swapsPage.serviceUnavailableHead",
                  )}
                />
                <ThemeText
                  removeMargin={true}
                  className="swap-error-message"
                  textContent={t(
                    "screens.inAccount.swapsPage.serviceUnavailableDesc",
                  )}
                />
                <CustomButton
                  textContent={t("constants.retry")}
                  actionFunction={loadPoolInfo}
                  buttonStyles={{ marginTop: 20 }}
                />
              </div>
            )}

            {!isLoadingPool && poolInfo && (
              <>
                <ThemeText
                  className="swap-step-title"
                  textContent={t(
                    "screens.inAccount.swapsPage.chooseCurrencyTitle",
                  )}
                />

                {/* BTC card */}
                <button
                  className="swap-selection-card"
                  style={{
                    backgroundColor: cardBg,
                    opacity: bitcoinBalanceIsAboveSwapLimit ? 1 : 0.3,
                  }}
                  disabled={!bitcoinBalanceIsAboveSwapLimit}
                  onClick={() => handleSelectFromAsset("BTC")}
                >
                  <div
                    className="swap-selection-icon"
                    style={{
                      backgroundColor:
                        theme && darkModeType ? backgroundOffset : "#F7931A",
                    }}
                  >
                    <Bitcoin size={22} color="white" />
                  </div>
                  <div className="swap-selection-text">
                    <ThemeText
                      removeMargin={true}
                      className="swap-selection-asset"
                      textContent={t("constants.bitcoin_upper")}
                    />
                    <ThemeText
                      removeMargin={true}
                      className="swap-selection-balance"
                      textContent={`${btcBalance.toLocaleString()} sats`}
                    />
                  </div>
                  <div
                    className={`swap-check-circle ${
                      fromAsset === "BTC" ? "active" : ""
                    }`}
                    style={{
                      borderColor: textColor,
                      backgroundColor:
                        fromAsset === "BTC" ? textColor : "transparent",
                    }}
                  >
                    {fromAsset === "BTC" && (
                      <Check size={14} color={theme ? "#000" : "#fff"} />
                    )}
                  </div>
                </button>

                {/* USD card */}
                <button
                  className="swap-selection-card"
                  style={{
                    backgroundColor: cardBg,
                    opacity: dollarBalanceIsAboveSwapLimit ? 1 : 0.3,
                  }}
                  disabled={!dollarBalanceIsAboveSwapLimit}
                  onClick={() => handleSelectFromAsset("USD")}
                >
                  <div
                    className="swap-selection-icon"
                    style={{
                      backgroundColor:
                        theme && darkModeType ? backgroundOffset : "#27AE60",
                    }}
                  >
                    <DollarSign size={22} color="white" />
                  </div>
                  <div className="swap-selection-text">
                    <ThemeText
                      removeMargin={true}
                      className="swap-selection-asset"
                      textContent={t("constants.dollars_upper")}
                    />
                    <ThemeText
                      removeMargin={true}
                      className="swap-selection-balance"
                      textContent={`$${dollarBalanceToken.toFixed(2)}`}
                    />
                  </div>
                  <div
                    className={`swap-check-circle ${
                      fromAsset === "USD" ? "active" : ""
                    }`}
                    style={{
                      borderColor: textColor,
                      backgroundColor:
                        fromAsset === "USD" ? textColor : "transparent",
                    }}
                  >
                    {fromAsset === "USD" && (
                      <Check size={14} color={theme ? "#000" : "#fff"} />
                    )}
                  </div>
                </button>

                <div style={{ marginTop: "auto" }} />

                <button
                  className="swap-history-btn"
                  onClick={() => navigateToStep("historyExpanded", "forward")}
                >
                  <History size={16} color={textColor} />
                  <ThemeText
                    removeMargin={true}
                    className="swap-history-label"
                    textContent={t("screens.inAccount.swapHistory.pageTitle")}
                  />
                </button>

                <CustomButton
                  textContent={t("constants.continue")}
                  actionFunction={() => {
                    if (
                      !bitcoinBalanceIsAboveSwapLimit &&
                      !dollarBalanceIsAboveSwapLimit
                    )
                      return;
                    navigateToStep("amountInput", "forward");
                  }}
                  buttonStyles={{
                    marginTop: 12,
                    opacity:
                      !bitcoinBalanceIsAboveSwapLimit &&
                      !dollarBalanceIsAboveSwapLimit
                        ? 0.3
                        : 1,
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* ── History Expanded ──────────────────────────────────────── */}
        {currentStep === "historyExpanded" && (
          <div className="swap-step-content swap-history-container">
            <div className="swap-history-header">
              <button
                className="swap-back-btn"
                onClick={() => navigateToStep("routeSelection", "backward")}
              >
                <ArrowLeft size={24} color={textColor} />
              </button>
            </div>

            {!finishedInitialHistoryLoad ? (
              <FullLoadingScreen />
            ) : swapHistory.swaps.length === 0 ? (
              <div className="swap-empty-container">
                <ArrowDownUp
                  size={40}
                  color={textColor}
                  style={{ opacity: 0.4 }}
                />
                <ThemeText
                  removeMargin={true}
                  className="swap-empty-title"
                  textContent={t(
                    "screens.inAccount.swapHistory.noHisotorytitle",
                  )}
                />
                <ThemeText
                  removeMargin={true}
                  className="swap-empty-subtext"
                  textContent={t(
                    "screens.inAccount.swapHistory.noHisotorydesc",
                  )}
                />
              </div>
            ) : (
              <div className="swap-history-list">
                {swapHistory.swaps.map((item) => {
                  const isBtcToUsd = item.assetInAddress === BTC_ASSET_ADDRESS;
                  const formattedAmountOut = isBtcToUsd
                    ? `$${(item.amountOut / Math.pow(10, 6)).toFixed(2)}`
                    : `${parseFloat(item.amountOut).toLocaleString()} sats`;
                  const price = currentPriceAinBToPriceDollars(
                    item.price,
                  ).toFixed(2);
                  const date = formatDate(item.timestamp);

                  return (
                    <div
                      key={item.id}
                      className="swap-tx-row"
                      style={{ backgroundColor: cardBg }}
                    >
                      <div className="swap-tx-icons">
                        <div
                          className="swap-tx-icon"
                          style={{
                            backgroundColor: isBtcToUsd ? "#F7931A" : "#27AE60",
                            zIndex: 2,
                            marginRight: -8,
                          }}
                        >
                          {isBtcToUsd ? (
                            <Bitcoin size={16} color="white" />
                          ) : (
                            <DollarSign size={16} color="white" />
                          )}
                        </div>
                        <div
                          className="swap-tx-icon"
                          style={{
                            backgroundColor: isBtcToUsd ? "#27AE60" : "#F7931A",
                          }}
                        >
                          {isBtcToUsd ? (
                            <DollarSign size={16} color="white" />
                          ) : (
                            <Bitcoin size={16} color="white" />
                          )}
                        </div>
                      </div>
                      <div className="swap-tx-content">
                        <ThemeText
                          removeMargin={true}
                          className="swap-tx-title"
                          textContent={
                            isBtcToUsd
                              ? t(
                                  "screens.inAccount.swapsPage.swapDirection_btcusd",
                                )
                              : t(
                                  "screens.inAccount.swapsPage.swapDirection_usdbtc",
                                )
                          }
                        />
                        <ThemeText
                          removeMargin={true}
                          className="swap-tx-subtext"
                          textContent={date}
                        />
                      </div>
                      <div className="swap-tx-amounts">
                        <ThemeText
                          removeMargin={true}
                          className="swap-tx-amount"
                          textContent={formattedAmountOut}
                        />
                        <ThemeText
                          removeMargin={true}
                          className="swap-tx-subtext"
                          textContent={`${APPROXIMATE_SYMBOL}$${price}`}
                        />
                      </div>
                    </div>
                  );
                })}

                {swapHistory.swaps.length < swapHistory.totalCount && (
                  <div className="swap-history-footer">
                    <CustomButton
                      textContent={t("constants.loadMore")}
                      actionFunction={loadMoreHistory}
                      disabled={isLoadingHistory}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Amount Input ──────────────────────────────────── */}
        {currentStep === "amountInput" && (
          <div className="swap-step-content">
            {/* Amount display card */}
            <div
              className="swap-amount-card"
              style={{ backgroundColor: cardBg }}
            >
              {/* From row */}
              <button
                className="swap-amount-row"
                style={{ opacity: lastEditedField === "from" ? 1 : 0.4 }}
                onClick={() => setLastEditedField("from")}
              >
                <div
                  className="swap-amount-icon"
                  style={{
                    backgroundColor:
                      theme && darkModeType
                        ? backgroundOffset
                        : fromAsset === "BTC"
                          ? "#F7931A"
                          : "#27AE60",
                  }}
                >
                  {fromAsset === "BTC" ? (
                    <Bitcoin size={16} color="white" />
                  ) : (
                    <DollarSign size={16} color="white" />
                  )}
                </div>
                <ThemeText
                  className={"swap-amount-text"}
                  textContent={displayCorrectDenomination({
                    amount: fromAmount || "0",
                    masterInfoObject: {
                      ...masterInfoObject,
                      userBalanceDenomination:
                        fromAsset === "USD" ? "fiat" : "sats",
                    },
                    fiatStats,
                    forceCurrency: "USD",
                    convertAmount: fromAsset !== "USD",
                  })}
                />
                <ThemeText
                  removeMargin={true}
                  className="swap-amount-currency"
                  textContent={
                    fromAsset === "USD"
                      ? t("constants.dollars_upper")
                      : t("constants.bitcoin_upper")
                  }
                />
              </button>

              <div
                className="swap-amount-divider"
                style={{
                  backgroundColor:
                    theme && darkModeType ? backgroundOffset : backgroundColor,
                }}
              />

              {/* To row */}
              <button
                className="swap-amount-row"
                style={{ opacity: lastEditedField === "to" ? 1 : 0.4 }}
                onClick={() => setLastEditedField("to")}
              >
                <div
                  className="swap-amount-icon"
                  style={{
                    backgroundColor:
                      theme && darkModeType
                        ? backgroundOffset
                        : toAsset === "BTC"
                          ? "#F7931A"
                          : "#27AE60",
                  }}
                >
                  {toAsset === "BTC" ? (
                    <Bitcoin size={16} color="white" />
                  ) : (
                    <DollarSign size={16} color="white" />
                  )}
                </div>
                {isSimulating ? (
                  <FullLoadingScreen
                    size="small"
                    containerStyles={{ flex: 0, marginRight: "auto" }}
                  />
                ) : (
                  <ThemeText
                    className={"swap-amount-text"}
                    textContent={
                      APPROXIMATE_SYMBOL +
                      " " +
                      displayCorrectDenomination({
                        amount: toAmount || "0",
                        masterInfoObject: {
                          ...masterInfoObject,
                          userBalanceDenomination:
                            toAsset === "USD" ? "fiat" : "sats",
                        },
                        fiatStats,
                        forceCurrency: "USD",
                        convertAmount: toAsset !== "USD",
                      })
                    }
                  />
                )}
                <ThemeText
                  className="swap-amount-currency"
                  textContent={
                    toAsset === "USD"
                      ? t("constants.dollars_upper")
                      : t("constants.bitcoin_upper")
                  }
                />
              </button>
            </div>

            {/* Percentage pills */}
            <div className="swap-pill-row">
              {[
                { label: "25%", value: "25", pct: 0.25 },
                { label: "50%", value: "50", pct: 0.5 },
                { label: "75%", value: "75", pct: 0.75 },
                { label: "100%", value: "100", pct: 1 },
              ].map((btn) => (
                <button
                  key={btn.value}
                  className="swap-pill"
                  style={{
                    backgroundColor:
                      activePercentage === btn.value ? textColor : cardBg,
                    color:
                      activePercentage === btn.value
                        ? theme
                          ? "#000"
                          : "#fff"
                        : textColor,
                  }}
                  onClick={() => {
                    isPillPressRef.current = true;
                    setActivePercentage(btn.value);
                    setPercentage(btn.pct);
                  }}
                  disabled={isSwapping || isLoadingPool}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <HandleKeyboardRender
              lastEditedField={lastEditedField}
              fromAsset={fromAsset}
              toAsset={toAsset}
              handleInput={(value, direction) =>
                handleFromAmountChange(value, direction)
              }
              fromAmount={fromAmount}
              toAmount={toAmount}
            />

            <CustomButton
              textContent={
                canSwap ? t("constants.review") : t("constants.back")
              }
              actionFunction={executeSwapAction}
              disabled={isSwapping || isLoadingPool || isSimulating}
              useLoading={isSimulating || isSwapping || isLoadingPool}
            />
            <ThemeText
              className="swap-disclaimer"
              textContent={t("screens.inAccount.swapsPage.swapDisclaimer")}
            />
          </div>
        )}

        {/* ── Step 3: Review ────────────────────────────────────────── */}
        {currentStep === "review" && (
          <div className="swap-step-content swap-review-content">
            <div className="swap-review-scroll">
              {/* Amount cards */}
              <div className="swap-card-container">
                <div className="swap-card" style={{ backgroundColor: cardBg }}>
                  <ThemeText
                    removeMargin={true}
                    className="swap-card-label"
                    textContent={t(
                      "screens.inAccount.swapsPage.yourAreConverting",
                    )}
                  />
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-amount"
                    textContent={formatAmountDisplay(fromAmount, fromAsset)}
                  />
                </div>

                <div
                  className="swap-direction-btn"
                  style={{
                    backgroundColor:
                      theme && darkModeType
                        ? Colors.dark.text
                        : Colors.constants.blue,
                  }}
                >
                  <ArrowDownUp
                    size={18}
                    color={
                      theme && darkModeType
                        ? Colors.light.text
                        : Colors.dark.text
                    }
                  />
                </div>

                <div className="swap-card" style={{ backgroundColor: cardBg }}>
                  <ThemeText
                    removeMargin={true}
                    className="swap-card-label"
                    textContent={t(
                      "screens.inAccount.swapsPage.youWillReceive",
                    )}
                  />
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-amount"
                    textContent={`${APPROXIMATE_SYMBOL} ${formatAmountDisplay(
                      toAmount,
                      toAsset,
                    )}`}
                  />
                </div>
              </div>

              {/* Rate card */}
              <div
                className="swap-card"
                style={{ backgroundColor: cardBg, marginBottom: 12 }}
              >
                <div className="swap-review-row">
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-label"
                    textContent={t("screens.inAccount.swapsPage.exchangeRate")}
                  />
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-value"
                    textContent={reviewExchangeRate}
                  />
                </div>
                <div
                  className="swap-review-divider"
                  style={{
                    backgroundColor:
                      theme && darkModeType
                        ? backgroundOffset
                        : backgroundColor,
                  }}
                />
                <div className="swap-review-row">
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-label"
                    textContent={t("screens.inAccount.swapsPage.bitcoinPrice")}
                  />
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-value"
                    textContent={`${APPROXIMATE_SYMBOL} $${Number(
                      swapUSDPriceDollars,
                    ).toFixed(2)}`}
                  />
                </div>
              </div>

              {/* Fee card */}
              <div
                className="swap-card"
                style={{ backgroundColor: cardBg, marginBottom: 12 }}
              >
                <div className="swap-review-row">
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-label"
                    textContent={t("screens.inAccount.swapsPage.swapFee")}
                  />
                  <ThemeText
                    removeMargin={true}
                    className="swap-review-value"
                    textContent={`${APPROXIMATE_SYMBOL} ${
                      isBtcToUsdbReview
                        ? `$${totalFee.toFixed(3)}`
                        : `${Math.round(totalFee).toLocaleString()} sats`
                    }`}
                  />
                </div>
              </div>

              {/* Slippage card */}
              <div
                className="swap-card"
                style={{ backgroundColor: cardBg, marginBottom: 12 }}
              >
                <div className="swap-review-row">
                  <button
                    className="swap-slippage-info"
                    onClick={() =>
                      openOverlay({
                        for: "informationPopup",
                        textContent: t(
                          "screens.inAccount.swapsPage.slippageDesc",
                        ),
                        buttonText: t("constants.iunderstand"),
                      })
                    }
                  >
                    <ThemeText
                      removeMargin={true}
                      className="swap-review-label"
                      textContent={t("screens.inAccount.swapsPage.slippage")}
                    />
                    <Info
                      size={16}
                      color={textColor}
                      style={{ marginLeft: 4 }}
                    />
                  </button>
                  <div className="swap-slippage-select">
                    <select
                      className="swap-slippage-dropdown"
                      style={{
                        backgroundColor: cardBg,
                        color: textColor,
                        borderColor: textColor,
                      }}
                      value={slippagePercent || ""}
                      onChange={(e) => setSlippagePercent(e.target.value)}
                    >
                      <option value="">
                        {t("screens.inAccount.swapsPage.auto")}
                      </option>
                      {SLIPPAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="swap-review-buttons">
              <CustomButton
                textContent={t("constants.back")}
                actionFunction={() => navigateToStep("amountInput", "backward")}
                disabled={isSwapping}
                buttonStyles={{ opacity: isSwapping ? 0.3 : 1, flex: 1 }}
              />
              <CustomButton
                textContent={t("constants.accept")}
                actionFunction={handleAcceptReview}
                disabled={isSwapping}
                useLoading={isSwapping}
              />
            </div>
            <ThemeText
              className="swap-disclaimer"
              textContent={t("screens.inAccount.swapsPage.swapDisclaimer")}
            />
          </div>
        )}

        {/* ── Step 4: Confirmation ──────────────────────────────────── */}
        {currentStep === "confirmation" && (
          <div className="swap-step-content swap-confirm-container">
            <Lottie
              ref={lottieRef}
              animationData={confirmAnimation}
              play
              loop={false}
              style={{ width: 100, height: 100 }}
            />
            <ThemeText
              removeMargin={true}
              className="swap-confirmed-title"
              textContent={t("screens.inAccount.swapsPage.swapConfimred")}
            />
            <div className="swap-confirm-buttons">
              <CustomButton
                textContent={t("constants.done")}
                actionFunction={onClose}
              />
              <CustomButton
                textContent={t("screens.inAccount.swapsPage.newSwap")}
                actionFunction={() => {
                  clearPageStates();
                  navigateToStep("routeSelection", "backward");
                }}
                buttonStyles={{
                  backgroundColor: "transparent",
                }}
                textStyles={{ color: textColor }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HandleKeyboardRender ─────────────────────────────────────────────────────

function HandleKeyboardRender({
  lastEditedField,
  fromAsset,
  toAsset,
  handleInput,
  fromAmount,
  toAmount,
}) {
  const [amount, setAmount] = useState(
    lastEditedField === "from" ? fromAmount : toAmount,
  );
  const fromAmountRef = useRef(fromAmount);
  const toAmountRef = useRef(toAmount);
  const amountRef = useRef(amount);

  useEffect(() => {
    amountRef.current = amount;
  }, [amount]);

  useEffect(() => {
    fromAmountRef.current = fromAmount;
  }, [fromAmount]);

  useEffect(() => {
    toAmountRef.current = toAmount;
  }, [toAmount]);

  useEffect(() => {
    handleInput(amount, lastEditedField);
  }, [amount]);

  useEffect(() => {
    if (fromAmount !== amountRef.current && lastEditedField === "from") {
      setAmount(fromAmount);
    } else if (toAmount !== amountRef.current && lastEditedField === "to") {
      setAmount(toAmount);
    }
  }, [fromAmount, toAmount, lastEditedField]);

  return (
    <CustomNumberKeyboard
      keyboardContianerClassName={"swapFlowKeyboardInput"}
      showDot={
        (lastEditedField === "from" && fromAsset === "USD") ||
        (lastEditedField === "to" && toAsset === "USD")
      }
      usingForBalance={true}
      setAmountValue={setAmount}
    />
  );
}
