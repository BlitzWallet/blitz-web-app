import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useThemeColors from "../../hooks/useThemeColors";
import { useThemeContext } from "../../contexts/themeContext";
import { useKeysContext } from "../../contexts/keysContext";
import { useGifts } from "../../contexts/giftContext";
import { useSpark } from "../../contexts/sparkContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";

// Web equivalents of mobile contexts (must exist in your web app)
import { useFlashnet } from "../../contexts/flashnetContext";
import { useUserBalanceContext } from "../../contexts/userBalanceContext";

import {
  HIDDEN_OPACITY,
  STARTING_INDEX_FOR_GIFTS_DERIVE,
} from "../../constants";
import {
  deriveSparkAddress,
  deriveSparkGiftMnemonic,
  deriveSparkIdentityKey,
  getSparkDefaultAccountNumber,
} from "../../functions/gift/deriveGiftWallet";

import { createGiftUrl } from "../../functions/gift/encodeDecodeSecret";
import { encryptMessage } from "../../functions/encodingAndDecoding";
import { getPublicKey } from "../../functions/seed";

import { sparkPaymenWrapper } from "../../functions/spark/payments";

import {
  BTC_ASSET_ADDRESS,
  USD_ASSET_ADDRESS,
  dollarsToSats,
  satsToDollars,
  simulateSwap,
  INTEGRATOR_FEE,
} from "../../functions/spark/flashnet";

import CustomButton from "../../components/customButton/customButton";
import ThemeText from "../../components/themeText/themeText";
import GiftConfirmation from "../giftConfirmation/giftConfirmation";
import { Colors } from "../../constants/theme";
import { ArrowLeft, ChevronsUpDown, Gift } from "lucide-react";
import "./createGift.css";
import { useNodeContext } from "../../contexts/nodeContext";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";

const PRIMARY_BLUE = Colors.constants.blue;

export default function CreateGift() {
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { bitcoinBalance, dollarBalanceSat, dollarBalanceToken } =
    useUserBalanceContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();

  const { poolInfoRef, swapLimits } = useFlashnet();
  const { saveGiftToCloud, deleteGiftFromCloudAndLocal } = useGifts();

  const navigate = useNavigate();

  const {
    textColor,
    backgroundColor,
    backgroundOffset,
    textInputBackground,
    textInputColor,
  } = useThemeColors();

  const { accountMnemoinc } = useKeysContext();
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { sparkInformation } = useSpark();

  // const { currentWalletMnemoinc } = useActiveCustodyAccount();

  const { fiatStats } = useNodeContext();

  // ---- Local state (aligned with mobile names) ----
  const [duration, setDuration] = useState(() => ({
    value: "7",
    label: t("screens.inAccount.giftPages.createGift.durationText", {
      numDays: 7,
    }),
  }));
  const [description, setDescription] = useState("");
  const [giftDenomination, setGiftDenomination] = useState("BTC");

  const simulationPromiseRef = useRef(null);
  const [simulationResult, setSimulationResult] = useState(null);

  const [loadingMessage, setLoadingMessage] = useState("");
  const [confirmData, setConfirmData] = useState(null);
  const [error, setError] = useState("");

  /**
   * Web input: user types an amount. We keep TWO fields like mobile route params:
   * - amount (sats) when denomination is BTC
   * - amountValue (USD) when denomination is USD
   */
  const [amountInput, setAmountInput] = useState("");

  // Mobile uses currentDerivedGiftIndex from masterInfoObject with fallback 1
  const currentDerivedGiftIndex =
    masterInfoObject?.currentDerivedGiftIndex || 1;

  // Parse input in a way that allows USD decimals
  const parsedNumber = useMemo(() => {
    const s = String(amountInput).trim();
    if (!s) return 0;
    // allow decimals for USD; sats should be integer but we’ll floor later
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [amountInput]);

  /**
   * Align with mobile variables:
   * - amount: sats amount (integer) OR (for USD path) still used as "convertedSatAmount"
   * - convertedSatAmount: amount in sats that receiver expects (gift amount)
   * - trueFiatAmount: micro-USD (USD * 1e6) like mobile
   *
   * For USD gifts: in mobile, amount is sats-equivalent used by payment wrappers;
   * trueFiatAmount is separately tracked. Here we compute both:
   * - if giftDenomination === "USD": treat input as USD, compute sats using current price
   */
  const amount = useMemo(() => {
    if (!parsedNumber) return 0;
    if (giftDenomination === "BTC")
      return Math.max(0, Math.floor(parsedNumber));
    // USD input: convert dollars -> sats using pool price, as best-effort.
    // NOTE: mobile uses route params amount/amountValue; their amount probably already computed elsewhere.
    // For parity here, we compute sats from USD.
    const usd = parsedNumber;
    const sats = dollarsToSats(usd, poolInfoRef.currentPriceAInB);
    return Math.max(0, Math.floor(sats));
  }, [parsedNumber, giftDenomination, poolInfoRef.currentPriceAInB]);

  const convertedSatAmount = amount;
  const trueFiatAmount = useMemo(() => {
    if (!parsedNumber) return 0;
    if (giftDenomination === "USD") {
      // input is USD -> microUSD
      return Math.round(parsedNumber * Math.pow(10, 6));
    }
    // BTC input: compute USD value and convert to microUSD (for sparkPaymenWrapper parity)
    const usd = satsToDollars(convertedSatAmount, poolInfoRef.currentPriceAInB);
    return Math.round(usd * Math.pow(10, 6));
  }, [
    parsedNumber,
    giftDenomination,
    convertedSatAmount,
    poolInfoRef.currentPriceAInB,
  ]);

  // ---- Duration options aligned with mobile (t keys + values "7","14",…) ----
  const GIFT_DURATIONS = useMemo(() => {
    return [7, 14, 30, 60, 90, 180].map((numDays) => ({
      label: t("screens.inAccount.giftPages.createGift.durationText", {
        numDays,
      }),
      value: String(numDays),
    }));
  }, [t]);

  const handleSelectProcess = useCallback(
    (e) => {
      const value = e.target.value;
      const found = GIFT_DURATIONS.find((x) => x.value === value);
      setDuration(found || GIFT_DURATIONS[0]);
    },
    [GIFT_DURATIONS],
  );

  // ---------------- Swap simulation (same logic as mobile) ----------------
  useEffect(() => {
    const calculateSwapSimulation = async () => {
      if (!convertedSatAmount) {
        simulationPromiseRef.current = null;
        setSimulationResult(null);
        return;
      }

      const hasBTCBalance = bitcoinBalance >= convertedSatAmount;
      const hasUSDBalance = dollarBalanceSat >= convertedSatAmount;

      const meetsUSDMinimum =
        convertedSatAmount >=
        dollarsToSats(swapLimits.usd, poolInfoRef.currentPriceAInB);
      const meetsBTCMinimum = convertedSatAmount >= swapLimits.bitcoin;

      let needsSwap = false;
      let paymentMethod = null;

      // Determine if swap is needed based on gift denomination
      if (giftDenomination === "BTC") {
        const canPayBTCtoBTC = hasBTCBalance;
        const canPayUSDtoBTC = hasUSDBalance && meetsUSDMinimum;

        if (canPayBTCtoBTC) {
          paymentMethod = "BTC";
          needsSwap = false;
        } else if (canPayUSDtoBTC) {
          paymentMethod = "USD";
          needsSwap = true;
        }
      } else {
        const canPayUSDtoUSD = hasUSDBalance;
        const canPayBTCtoUSD = hasBTCBalance && meetsBTCMinimum;

        if (canPayUSDtoUSD) {
          paymentMethod = "USD";
          needsSwap = false;
        } else if (canPayBTCtoUSD) {
          paymentMethod = "BTC";
          needsSwap = true;
        }
      }

      if (!needsSwap || !paymentMethod) {
        simulationPromiseRef.current = null;
        setSimulationResult(null);
        return;
      }

      // Start the simulation
      const swapPromise = simulateSwap(currentWalletMnemoinc, {
        poolId: poolInfoRef.lpPublicKey,
        assetInAddress:
          paymentMethod === "BTC" ? BTC_ASSET_ADDRESS : USD_ASSET_ADDRESS,
        assetOutAddress:
          paymentMethod === "BTC" ? USD_ASSET_ADDRESS : BTC_ASSET_ADDRESS,
        amountIn: paymentMethod === "BTC" ? convertedSatAmount : trueFiatAmount,
      });

      simulationPromiseRef.current = swapPromise;

      try {
        const swap = await swapPromise;
        if (swap.didWork) {
          setSimulationResult({
            simulation: swap.simulation,
            paymentMethod,
          });
        } else {
          setSimulationResult(null);
        }
      } catch (err) {
        console.error("Swap simulation error:", err);
        setSimulationResult(null);
      }
    };

    calculateSwapSimulation();
  }, [
    convertedSatAmount,
    giftDenomination,
    bitcoinBalance,
    dollarBalanceSat,
    swapLimits,
    poolInfoRef.currentPriceAInB,
    currentWalletMnemoinc,
  ]);

  // ---------------- determinePaymentMethod (same as mobile) ----------------
  const determinePaymentMethod = useMemo(() => {
    const hasBTCBalance = bitcoinBalance >= convertedSatAmount;
    const hasUSDBalance = dollarBalanceSat >= convertedSatAmount;

    const meetsUSDMinimum =
      convertedSatAmount >=
      dollarsToSats(swapLimits.usd, poolInfoRef.currentPriceAInB);
    const meetsBTCMinimum = convertedSatAmount >= swapLimits.bitcoin;

    // Receiver expects BTC
    if (giftDenomination === "BTC") {
      const canPayBTCtoBTC = hasBTCBalance;
      const canPayUSDtoBTC = hasUSDBalance && meetsUSDMinimum;

      if (canPayBTCtoBTC) return "BTC";

      // factor in swap fee (same as mobile)
      if (simulationResult && canPayUSDtoBTC) {
        const { simulation } = simulationResult;
        const totalUSDNeeded = Math.round(
          satsToDollars(convertedSatAmount, poolInfoRef.currentPriceAInB) *
            Math.pow(10, 6) +
            Number(simulation.feePaidAssetIn),
        );

        if (totalUSDNeeded > dollarBalanceToken * Math.pow(10, 6)) {
          return null;
        }
      }

      return canPayBTCtoBTC ? "BTC" : canPayUSDtoBTC ? "USD" : null;
    }
    // Receiver expects USD
    else {
      const canPayUSDtoUSD = hasUSDBalance;
      const canPayBTCtoUSD = hasBTCBalance && meetsBTCMinimum;

      if (canPayUSDtoUSD) return "USD";

      if (simulationResult && canPayBTCtoUSD) {
        const { simulation } = simulationResult;
        const totalBTCNeeded = Math.round(
          convertedSatAmount +
            dollarsToSats(Number(simulation.feePaidAssetIn) / Math.pow(10, 6)) +
            convertedSatAmount * INTEGRATOR_FEE,
        );

        if (totalBTCNeeded > bitcoinBalance) {
          return null;
        }
      }

      return canPayUSDtoUSD ? "USD" : canPayBTCtoUSD ? "BTC" : null;
    }
  }, [
    giftDenomination,
    bitcoinBalance,
    dollarBalanceSat,
    dollarBalanceToken,
    convertedSatAmount,
    swapLimits,
    poolInfoRef.currentPriceAInB,
    simulationResult,
  ]);

  // ---------------- isGiftValid (same as mobile) ----------------
  const isGiftValid = useMemo(() => {
    if (!convertedSatAmount) return false;

    const totalBalance = bitcoinBalance + dollarBalanceSat;
    if (totalBalance < convertedSatAmount) return false;

    if (
      bitcoinBalance < convertedSatAmount &&
      dollarBalanceSat < convertedSatAmount &&
      totalBalance >= convertedSatAmount
    ) {
      return false;
    }

    const hasBTCBalance = bitcoinBalance >= convertedSatAmount;
    const hasUSDBalance = dollarBalanceSat >= convertedSatAmount;

    const meetsUSDMinimum =
      convertedSatAmount >=
      dollarsToSats(swapLimits.usd, poolInfoRef.currentPriceAInB);
    const meetsBTCMinimum = convertedSatAmount >= swapLimits.bitcoin;

    console.log("convertedSatAmount", convertedSatAmount);
    console.log("swapLimits.usd", swapLimits.usd);
    console.log("meetsUSDMinimum", meetsUSDMinimum);

    if (giftDenomination === "BTC") {
      const canPayBTCtoBTC = hasBTCBalance;
      const canPayUSDtoBTC = hasUSDBalance && meetsUSDMinimum;

      if (!canPayBTCtoBTC && canPayUSDtoBTC && simulationResult) {
        const { simulation } = simulationResult;
        const totalUSDNeeded = Math.round(
          satsToDollars(convertedSatAmount, poolInfoRef.currentPriceAInB) *
            Math.pow(10, 6) +
            Number(simulation.feePaidAssetIn),
        );

        if (totalUSDNeeded > dollarBalanceToken * Math.pow(10, 6)) {
          return false;
        }
      }

      if (!canPayBTCtoBTC && !canPayUSDtoBTC) return false;
    } else {
      const canPayUSDtoUSD = hasUSDBalance;
      const canPayBTCtoUSD = hasBTCBalance && meetsBTCMinimum;

      if (!canPayUSDtoUSD && canPayBTCtoUSD && simulationResult) {
        const { simulation } = simulationResult;
        const totalBTCNeeded = Math.round(
          convertedSatAmount +
            dollarsToSats(Number(simulation.feePaidAssetIn) / Math.pow(10, 6)) +
            convertedSatAmount * INTEGRATOR_FEE,
        );

        console.log("totalBTCNeeded", totalBTCNeeded);

        if (totalBTCNeeded > bitcoinBalance) {
          return false;
        }
      }

      if (!canPayUSDtoUSD && !canPayBTCtoUSD) return false;
    }

    return true;
  }, [
    convertedSatAmount,
    bitcoinBalance,
    dollarBalanceSat,
    dollarBalanceToken,
    giftDenomination,
    swapLimits,
    poolInfoRef.currentPriceAInB,
    simulationResult,
  ]);

  // ---------------- createGift (same steps as mobile) ----------------
  const createGift = useCallback(async () => {
    try {
      setError("");
      setLoadingMessage("Starting gift creation...");

      if (!convertedSatAmount) {
        throw new Error("No amount provided.");
      }

      if (
        bitcoinBalance < convertedSatAmount &&
        dollarBalanceSat < convertedSatAmount
      ) {
        if (bitcoinBalance + dollarBalanceSat > convertedSatAmount) {
          throw new Error("Balance fragmentation error.");
        } else {
          throw new Error("Insufficient balance.");
        }
      }

      // wait for simulation to finish (same as mobile)
      if (simulationPromiseRef.current) {
        simulationPromiseRef.current;
        await new Promise((res) => setTimeout(res, 500));
      }

      if (!determinePaymentMethod) {
        throw new Error("Swap minimum / payment method error.");
      }

      const needsSwap =
        (determinePaymentMethod === "USD" && giftDenomination === "BTC") ||
        (determinePaymentMethod === "BTC" && giftDenomination === "USD");

      const giftId = crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());

      const currentDeriveIndex =
        STARTING_INDEX_FOR_GIFTS_DERIVE + currentDerivedGiftIndex;

      setLoadingMessage("Deriving gift wallet...");

      const giftWalletMnemoinc = await deriveSparkGiftMnemonic(
        accountMnemoinc,
        currentDeriveIndex,
        getSparkDefaultAccountNumber(),
      );

      console.log("giftWalletMnemoinc", giftWalletMnemoinc);
      if (!giftWalletMnemoinc?.success) {
        throw new Error(
          giftWalletMnemoinc?.error || "Failed to derive gift wallet mnemonic",
        );
      }

      setLoadingMessage("Generating secret + encrypting mnemonic...");

      const randomSecret = crypto.getRandomValues(new Uint8Array(32));
      const randomPubkey = getPublicKey(randomSecret); // must match your implementation
      const encryptedMnemonic = await encryptMessage(
        randomSecret,
        randomPubkey,
        giftWalletMnemoinc.derivedMnemonic,
      );

      if (!encryptedMnemonic) {
        throw new Error("Encryption failed");
      }

      const urls = createGiftUrl(giftId, randomSecret);

      const daysInMS = 1000 * 60 * 60 * 24;
      const giftDuration = Number(duration.value);
      const addedMS = giftDuration * daysInMS;

      let storageObject = {
        uuid: giftId,
        createdTime: Date.now(),
        lastUpdated: Date.now(),
        expireTime: Date.now() + addedMS,
        encryptedText: encryptedMnemonic,
        amount: convertedSatAmount,
        dollarAmount: satsToDollars(
          convertedSatAmount,
          poolInfoRef.currentPriceAInB,
        ).toFixed(2),
        description: description || "",
        createdBy: masterInfoObject?.uuid,
        state: "Unclaimed",
        giftNum: currentDeriveIndex,
        claimURL: urls.webUrl,
        satDisplay: masterInfoObject?.satDisplay,
        denomination: giftDenomination,
      };

      setLoadingMessage("Deriving gift address...");

      const derivedIdentityPubKey = await deriveSparkIdentityKey(
        giftWalletMnemoinc.derivedMnemonic,
        getSparkDefaultAccountNumber(),
      );
      if (!derivedIdentityPubKey?.success) {
        throw new Error(
          derivedIdentityPubKey?.error || "Failed to derive identity key",
        );
      }

      const derivedSparkAddress = deriveSparkAddress(
        derivedIdentityPubKey.publicKey,
      );
      storageObject.identityPubKey = derivedIdentityPubKey.publicKeyHex;

      if (!derivedSparkAddress?.success) {
        throw new Error("Failed to derive spark address");
      }

      setLoadingMessage("Saving gift...");
      const didSave = await saveGiftToCloud(storageObject);
      if (!didSave) {
        throw new Error("Failed to save gift");
      }

      let swapPaymentQuote;
      if (needsSwap) {
        if (!simulationResult || !simulationResult.simulation) {
          throw new Error("Swap simulation not available or failed");
        }
        const simulation = simulationResult.simulation;

        const satFee =
          determinePaymentMethod === "BTC"
            ? Math.round(
                dollarsToSats(
                  Number(simulation.feePaidAssetIn) / Math.pow(10, 6),
                ) +
                  convertedSatAmount * INTEGRATOR_FEE,
              )
            : dollarsToSats(
                Number(simulation.feePaidAssetIn) / Math.pow(10, 6),
                poolInfoRef.currentPriceAInB,
              );

        swapPaymentQuote = {
          warn: parseFloat(simulation.priceImpact) > 3,
          poolId: poolInfoRef.lpPublicKey,
          assetInAddress:
            determinePaymentMethod === "BTC"
              ? BTC_ASSET_ADDRESS
              : USD_ASSET_ADDRESS,
          assetOutAddress:
            determinePaymentMethod === "BTC"
              ? USD_ASSET_ADDRESS
              : BTC_ASSET_ADDRESS,
          amountIn:
            determinePaymentMethod === "BTC"
              ? Math.min(
                  Math.round(
                    convertedSatAmount +
                      dollarsToSats(
                        Number(simulation.feePaidAssetIn) / Math.pow(10, 6),
                      ) +
                      convertedSatAmount * INTEGRATOR_FEE,
                  ),
                  bitcoinBalance,
                )
              : Math.min(
                  Math.round(
                    trueFiatAmount + Number(simulation.feePaidAssetIn),
                  ),
                  dollarBalanceToken * Math.pow(10, 6),
                ),
          dollarBalanceSat,
          bitcoinBalance,
          satFee,
        };
      }
      setLoadingMessage("Funding gift...");
      let paymentType;
      if (import.meta.env.VITE_MODE === "development") {
        paymentType = "sparkrt";
      } else {
        paymentType = "spark";
      }
      console.log(currentWalletMnemoinc);
      console.log(accountMnemoinc);
      const paymentResponse = await sparkPaymenWrapper({
        address: derivedSparkAddress.address,
        paymentType: "spark",
        amountSats: convertedSatAmount,
        masterInfoObject,
        memo: "Fund Gift",
        userBalance: sparkInformation?.userBalance,
        sparkInformation,
        mnemonic: currentWalletMnemoinc || accountMnemoinc,
        usablePaymentMethod: determinePaymentMethod,
        swapPaymentQuote,
        paymentInfo: {
          data: {
            expectedReceive: giftDenomination === "BTC" ? "sats" : "tokens",
          },
        },
        fiatValueConvertedSendAmount: Math.min(
          trueFiatAmount,
          dollarBalanceToken * Math.pow(10, 6),
        ),
        poolInfoRef,
      });

      console.log("paymentResponse", paymentResponse);
      if (!paymentResponse?.didWork) {
        await deleteGiftFromCloudAndLocal(storageObject.uuid);
        throw new Error("Payment error");
      }

      // mobile increments masterInfoObject index
      toggleMasterInfoObject({
        currentDerivedGiftIndex: currentDerivedGiftIndex + 1,
      });

      setLoadingMessage("");

      setConfirmData({
        qrData: urls.qrData,
        webUrl: urls.webUrl,
        storageObject,
        giftSecret: randomSecret,
      });
    } catch (err) {
      console.error(err);
      setLoadingMessage("");
      setError(err?.message || "Failed to create gift");
    }
  }, [
    accountMnemoinc,
    bitcoinBalance,
    dollarBalanceSat,
    dollarBalanceToken,
    convertedSatAmount,
    currentDerivedGiftIndex,
    deleteGiftFromCloudAndLocal,
    description,
    determinePaymentMethod,
    duration.value,
    giftDenomination,
    masterInfoObject,
    poolInfoRef,
    saveGiftToCloud,
    simulationResult,
    sparkInformation,
    swapLimits,
    trueFiatAmount,
    toggleMasterInfoObject,
  ]);

  const resetPageState = useCallback(() => {
    setLoadingMessage("");
    setConfirmData(null);
    setDescription("");
    setAmountInput("");
    simulationPromiseRef.current = null;
    setSimulationResult(null);
  }, []);

  if (confirmData) {
    const so = confirmData.storageObject;
    const formattedAmount =
      so.denomination === "BTC"
        ? `${Number(so.amount).toLocaleString()} sats`
        : `$${so.dollarAmount} USD`;

    return (
      <GiftConfirmation
        amount={so.amount}
        description={so.description}
        expiration={new Date(so.expireTime).toLocaleString()}
        giftLink={confirmData.webUrl}
        resetPageState={resetPageState}
        storageObject={{
          denomination: so.denomination,
          dollarAmount: Number(so.dollarAmount),
        }}
        formattedAmount={formattedAmount}
        onDone={() => navigate(-1)}
      />
    );
  }

  const durationDropdownBg = theme ? backgroundColor : textInputBackground;

  /** Matches mobile TextInput placeholderTextColor (theme + darkModeType). */
  const inputPlaceholderColor =
    theme && !darkModeType
      ? Colors.constants.darkModeTextInputPlaceholder
      : "#767676";

  // ---------------- UI (web) — aligned with mobile GlobalThemeView + field layout ----------------
  return (
    <div
      className="createGift-container"
      style={{
        backgroundColor,
        ["--createGift-placeholder"]: inputPlaceholderColor,
      }}
    >
      <div className="createGift-header">
        <button
          type="button"
          className="createGift-backBtn"
          onClick={() => navigate(-1)}
          aria-label={t("constants.back")}
        >
          <ArrowLeft
            size={24}
            strokeWidth={2.25}
            aria-hidden
            color={PRIMARY_BLUE}
          />
        </button>
        <ThemeText
          className="createGift-title"
          textContent={t("screens.inAccount.giftPages.createGift.header")}
          textStyles={{
            flex: 1,
            minWidth: 0,
            fontSize: "18px",
            fontWeight: 600,
            textAlign: "center",
            margin: 0,
          }}
        />
        <div className="createGift-topBarSpacer" />
      </div>

      {loadingMessage ? (
        <div className="createGift-loading">
          <div className="createGift-loadingSpinner" />
          <ThemeText
            textContent={loadingMessage}
            textStyles={{ fontSize: 16, margin: 0 }}
          />
        </div>
      ) : (
        <div className="createGift-form">
          <div
            className="createGift-iconCircle"
            style={{ backgroundColor: backgroundOffset }}
            aria-hidden
          >
            <Gift size={40} strokeWidth={1.75} color={PRIMARY_BLUE} />
          </div>

          {/* Amount */}
          <div
            className="createGift-field"
            style={{ backgroundColor: backgroundOffset }}
          >
            <ThemeText
              className="createGift-label createGift-label--field"
              textContent={t("constants.amount")}
              textStyles={{ fontWeight: 500, marginBottom: 12 }}
            />
            <input
              className="createGift-input createGift-input--amount"
              style={{
                backgroundColor: textInputBackground,
                color: textInputColor,
                borderColor: backgroundColor,
                borderWidth: 1,
                borderStyle: "solid",
              }}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder={
                giftDenomination === "BTC"
                  ? t(
                      "screens.inAccount.giftPages.createGift.amountPlaceholderBtc",
                    )
                  : t(
                      "screens.inAccount.giftPages.createGift.amountPlaceholderUsd",
                    )
              }
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            <ThemeText
              className="createGift-hint"
              textContent={
                giftDenomination === "BTC"
                  ? `≈ $${satsToDollars(convertedSatAmount, poolInfoRef.currentPriceAInB).toFixed(2)}`
                  : `≈ ${convertedSatAmount} sats`
              }
              textStyles={{ opacity: 0.7, margin: 0, fontSize: 14 }}
            />
          </div>

          {/* Type — segmented control: outer radius 8px only, flat split (mobile DenominationToggle) */}
          <div
            className="createGift-field"
            style={{ backgroundColor: backgroundOffset }}
          >
            <ThemeText
              className="createGift-label createGift-label--field"
              textContent={t("screens.inAccount.giftPages.createGift.type")}
              textStyles={{ fontWeight: 500, marginBottom: 12 }}
            />
            <div
              className="createGift-denomToggle"
              style={{
                backgroundColor: textInputBackground,
                border: `1px solid ${backgroundColor}`,
              }}
            >
              <button
                type="button"
                className={`createGift-denomBtn ${giftDenomination === "BTC" ? "active" : ""}`}
                onClick={() => setGiftDenomination("BTC")}
                style={
                  giftDenomination === "BTC"
                    ? {
                        backgroundColor: PRIMARY_BLUE,
                        color: "#FFFFFF",
                        opacity: 1,
                      }
                    : {
                        backgroundColor: "transparent",
                        color: textColor,
                        opacity: 0.5,
                      }
                }
              >
                {t("constants.bitcoin_upper")}
              </button>
              <button
                type="button"
                className={`createGift-denomBtn ${giftDenomination === "USD" ? "active" : ""}`}
                onClick={() => setGiftDenomination("USD")}
                style={{
                  ...(giftDenomination === "USD"
                    ? {
                        backgroundColor: PRIMARY_BLUE,
                        color: "#FFFFFF",
                        opacity: 1,
                      }
                    : {
                        backgroundColor: "transparent",
                        color: textColor,
                        opacity: 0.5,
                      }),
                  borderLeft: `1px solid ${backgroundColor}`,
                }}
              >
                {t("constants.dollars_upper")}
              </button>
            </div>
          </div>

          {/* Description */}
          <div
            className="createGift-field"
            style={{ backgroundColor: backgroundOffset }}
          >
            <div className="createGift-descriptionLabelRow">
              <ThemeText
                className="createGift-label"
                textContent={t("constants.description")}
                textStyles={{ fontWeight: 500, margin: 0 }}
              />
              <ThemeText
                className="createGift-label createGift-label--optional"
                textContent={t("constants.optionalFlag")}
                textStyles={{
                  fontWeight: 500,
                  fontSize: 12,
                  opacity: 0.5,
                  margin: 0,
                }}
              />
            </div>
            <textarea
              className="createGift-textarea"
              style={{
                backgroundColor: textInputBackground,
                color: textInputColor,
                borderColor: backgroundColor,
                borderWidth: 1,
                borderStyle: "solid",
              }}
              placeholder={t(
                "screens.inAccount.giftPages.createGift.inputPlaceholder",
              )}
              maxLength={150}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Duration — matches mobile DropdownMenu surface (not primary blue) */}
          <div
            className="createGift-field"
            style={{ backgroundColor: backgroundOffset }}
          >
            <ThemeText
              className="createGift-label createGift-label--field"
              textContent={t("apps.VPN.durationSlider.duration")}
              textStyles={{ fontWeight: 500, marginBottom: 12 }}
            />
            <div className="createGift-durationWrap">
              <select
                className="createGift-select createGift-select--duration"
                style={{
                  backgroundColor: durationDropdownBg,
                  color: textInputColor,
                  borderColor: backgroundColor,
                }}
                value={duration.value}
                onChange={handleSelectProcess}
                aria-label={t("apps.VPN.durationSlider.duration")}
              >
                {GIFT_DURATIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="createGift-durationChevron">
                <ChevronsUpDown
                  size={20}
                  strokeWidth={2.25}
                  color={textInputColor}
                />
              </span>
            </div>
          </div>

          <ThemeText
            className="createGift-disclaimer"
            textContent={t(
              "screens.inAccount.giftPages.createGift.disclaimer",
              {
                numDays: duration.value,
              },
            )}
            textStyles={{
              textAlign: "center",
              opacity: 0.6,
              fontSize: 13,
              lineHeight: "20px",
              margin: 0,
            }}
          />

          {!isGiftValid && (
            <p className="createGift-error">
              Gift is not valid (insufficient balance, fragmentation, or swap
              minimum not met).
            </p>
          )}

          {error && <p className="createGift-error">{error}</p>}

          <CustomButton
            actionFunction={createGift}
            textContent={t("screens.inAccount.giftPages.createGift.button")}
            buttonStyles={{
              width: "100%",
              maxWidth: 448,
              opacity: !isGiftValid ? HIDDEN_OPACITY : 1,
            }}
            disabled={!isGiftValid}
          />
        </div>
      )}
    </div>
  );
}
