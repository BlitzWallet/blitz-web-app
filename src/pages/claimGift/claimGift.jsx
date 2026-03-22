import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useKeysContext } from "../../contexts/keysContext";
import { useGifts } from "../../contexts/giftsContext";
import { useSpark } from "../../contexts/sparkContext";
import {
  STARTING_INDEX_FOR_GIFTS_DERIVE,
  GIFT_DERIVE_PATH_CUTOFF,
  WEBSITE_REGEX,
} from "../../constants";
import { parseGiftUrl } from "../../functions/gift/encodeDecodeSecret";
import { deriveSparkGiftMnemonic } from "../../functions/gift/deriveGiftWallet";
import { deriveKeyFromMnemonic, getPublicKey } from "../../functions/seed";
import { decryptMessage } from "../../functions/encodingAndDecoding";
import { getGiftCard, deleteGift } from "../../../db";
import {
  initializeSparkWallet,
  getSparkBalance,
  sendSparkPayment,
  sendSparkTokens,
  getSparkPaymentFeeEstimate,
} from "../../functions/spark/index";
import {
  getGiftByUuid,
  updateGiftLocal,
} from "../../functions/gift/giftsStorage";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import CustomButton from "../../components/customButton/customButton";
import "./claimGift.css";

export default function ClaimGiftScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundColor, backgroundOffset } = useThemeColors();
  const { accountMnemoinc } = useKeysContext();
  const { sparkInformation } = useSpark();
  const { updateGiftState, refreshGifts } = useGifts();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  const {
    claimType = "claim",
    url,
    giftUuid,
    expertMode,
    customGiftIndex,
  } = location.state || {};

  const [giftDetails, setGiftDetails] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState("");
  const [didClaim, setDidClaim] = useState(false);
  const [error, setError] = useState("");

  const walletInitPromise = useRef(null);
  const walletInitResult = useRef(null);
  const isClaimingRef = useRef(false);

  const denomination = giftDetails?.denomination || "BTC";

  const deriveClaimGiftSeed = useCallback(async () => {
    const parsedURL = parseGiftUrl(url);
    if (!parsedURL) throw new Error("Invalid gift link format");

    const retrivedGift = await getGiftCard(parsedURL.giftId);
    if (!retrivedGift || retrivedGift?.expireTime < Date.now()) {
      throw new Error("Gift has expired or was already claimed");
    }

    const publicKey = getPublicKey(parsedURL.secret);
    const decodedSeed = await decryptMessage(
      parsedURL.secret,
      publicKey,
      retrivedGift.encryptedText,
    );

    if (!decodedSeed || decodedSeed.split(" ").length < 5) {
      throw new Error("Could not decrypt gift seed");
    }

    return { ...retrivedGift, giftSeed: decodedSeed };
  }, [url]);

  const deriveReclaimGiftSeed = useCallback(async () => {
    if (expertMode) {
      const giftWalletMnemonic = deriveSparkGiftMnemonic(
        accountMnemoinc,
        STARTING_INDEX_FOR_GIFTS_DERIVE + customGiftIndex,
      );
      return { giftSeed: giftWalletMnemonic.derivedMnemonic };
    }

    let uuid;
    if (WEBSITE_REGEX.test(url)) {
      const parsedURL = parseGiftUrl(url);
      uuid = parsedURL.giftId;
    } else {
      uuid = giftUuid || url;
    }

    const savedGift = getGiftByUuid(uuid);
    if (!savedGift) throw new Error("Gift not found locally");

    if (Date.now() < savedGift.expireTime) {
      throw new Error(
        "This gift has not expired yet. You can only reclaim expired gifts.",
      );
    }

    let giftWalletMnemonic;
    if (savedGift.createdTime > GIFT_DERIVE_PATH_CUTOFF) {
      giftWalletMnemonic = deriveSparkGiftMnemonic(
        accountMnemoinc,
        savedGift.giftNum,
      );
    } else {
      giftWalletMnemonic = deriveKeyFromMnemonic(
        accountMnemoinc,
        savedGift.giftNum,
      );
    }

    if (!giftWalletMnemonic.success) {
      throw new Error("Failed to derive gift wallet");
    }

    return { ...savedGift, giftSeed: giftWalletMnemonic.derivedMnemonic };
  }, [expertMode, url, giftUuid, customGiftIndex, accountMnemoinc]);

  const loadGiftDetails = useCallback(async () => {
    try {
      const details =
        claimType === "reclaim"
          ? await deriveReclaimGiftSeed()
          : await deriveClaimGiftSeed();

      setGiftDetails(details);

      const network =
        import.meta.env.MODE === "development" ? "REGTEST" : "MAINNET";
      walletInitPromise.current = initializeSparkWallet(
        details.giftSeed,
        network,
      )
        .then((result) => {
          walletInitResult.current = result;
          return result;
        })
        .catch((err) => {
          console.log("Pre-initialization failed:", err);
          walletInitResult.current = null;
          return null;
        });
    } catch (err) {
      console.error("loadGiftDetails error:", err);
      setError(err.message);
    }
  }, [claimType, deriveReclaimGiftSeed, deriveClaimGiftSeed]);

  const getBalanceWithRetry = useCallback(async (seed, expectedAmount) => {
    const delays = [5000, 7000, 8000];
    let attempt = 0;

    setClaimStatus("Checking gift balance...");
    let result = await getSparkBalance(seed);

    const hasExpectedBalance = (res) => {
      if (!res?.didWork) return false;
      return Number(res.balance) >= (expectedAmount || 0) * 0.97;
    };

    if (hasExpectedBalance(result)) return result;

    for (const delay of delays) {
      attempt++;
      setClaimStatus(
        `Waiting for balance confirmation (attempt ${attempt + 1})...`,
      );
      await new Promise((res) => setTimeout(res, delay));
      result = await getSparkBalance(seed);
      if (hasExpectedBalance(result)) return result;
    }

    return result;
  }, []);

  const ensureWalletInitialized = useCallback(async (giftSeed) => {
    let initResult = walletInitResult.current;

    if (walletInitPromise.current && !initResult) {
      initResult = await walletInitPromise.current;
    }

    if (!initResult) {
      const network =
        import.meta.env.MODE === "development" ? "REGTEST" : "MAINNET";
      initResult = await initializeSparkWallet(giftSeed, network);
    }

    if (!initResult) {
      throw new Error("Failed to initialize gift wallet");
    }

    return initResult;
  }, []);

  const handleClaim = useCallback(async () => {
    if (isClaimingRef.current || !giftDetails) return;
    if (!accountMnemoinc) {
      setError("Wallet not ready");
      return;
    }

    isClaimingRef.current = true;
    setIsClaiming(true);
    setError("");

    try {
      setClaimStatus("Connecting to gift wallet...");
      await ensureWalletInitialized(giftDetails.giftSeed);

      const receivingAddress = sparkInformation.sparkAddress;
      if (!receivingAddress)
        throw new Error("Your Spark address is not available");

      const walletBalance = await getBalanceWithRetry(
        giftDetails.giftSeed,
        expertMode ? undefined : giftDetails.amount,
      );

      const bitcoinBalance = walletBalance?.didWork
        ? Number(walletBalance.balance)
        : 0;

      if (bitcoinBalance <= 0) {
        if (claimType === "reclaim" && !expertMode && giftDetails.uuid) {
          try {
            await deleteGift(giftDetails.uuid);
          } catch {
            /* best-effort */
          }
          updateGiftState(giftDetails.uuid, { state: "Reclaimed" });
        }
        throw new Error(
          expertMode
            ? "No balance found. This gift may have already been claimed."
            : "Gift wallet has no balance",
        );
      }

      let fees = 0;
      try {
        fees = await getSparkPaymentFeeEstimate(
          bitcoinBalance,
          giftDetails.giftSeed,
        );
      } catch {
        fees = 0;
      }

      const sendingAmount = bitcoinBalance - fees;
      if (sendingAmount <= 0) {
        throw new Error("Balance too low to cover network fees");
      }

      setClaimStatus("Sending funds to your wallet...");
      const paymentResponse = await sendSparkPayment({
        receiverSparkAddress: receivingAddress,
        amountSats: sendingAmount,
        mnemonic: giftDetails.giftSeed,
      });

      if (!paymentResponse.didWork) {
        throw new Error("Payment failed. Please try again.");
      }

      if (!expertMode && giftDetails.uuid) {
        try {
          await deleteGift(giftDetails.uuid);
        } catch {
          /* best-effort cloud delete */
        }

        if (claimType === "reclaim") {
          updateGiftState(giftDetails.uuid, { state: "Reclaimed" });
        }
      }

      refreshGifts();
      setDidClaim(true);
    } catch (err) {
      console.error("Claim error:", err);
      setError(err.message || "Claim failed");
    } finally {
      setIsClaiming(false);
      setClaimStatus("");
      isClaimingRef.current = false;
    }
  }, [
    giftDetails,
    accountMnemoinc,
    claimType,
    expertMode,
    sparkInformation,
    ensureWalletInitialized,
    getBalanceWithRetry,
    updateGiftState,
    refreshGifts,
  ]);

  useEffect(() => {
    if (!expertMode && !url && !giftUuid) return;

    const isConnected =
      sparkInformation.identityPubKey && sparkInformation.didConnect;

    if (isConnected) {
      loadGiftDetails();
    }
  }, [
    url,
    giftUuid,
    sparkInformation.identityPubKey,
    sparkInformation.didConnect,
    expertMode,
    loadGiftDetails,
  ]);

  useEffect(() => {
    return () => {
      walletInitPromise.current = null;
      walletInitResult.current = null;
      isClaimingRef.current = false;
    };
  }, []);

  const cardBg = useMemo(() => {
    return backgroundOffset;
  }, [backgroundOffset]);

  if (!sparkInformation.identityPubKey || !sparkInformation.didConnect) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-loading">
          <div className="claimGift-spinner" />
          <p style={{ color: textColor }}>Connecting to Spark...</p>
        </div>
      </div>
    );
  }

  if (!giftDetails && !error) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-loading">
          <div className="claimGift-spinner" />
          <p style={{ color: textColor }}>Loading gift details...</p>
        </div>
      </div>
    );
  }

  if (didClaim) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-success">
          <div className="claimGift-successIcon">🎉</div>
          <p className="claimGift-successTitle" style={{ color: textColor }}>
            {claimType === "claim" ? "Gift Claimed!" : "Gift Reclaimed!"}
          </p>
          {giftDetails?.description && claimType === "claim" && (
            <p
              className="claimGift-successMessage"
              style={{ color: textColor }}
            >
              "{giftDetails.description}"
            </p>
          )}
          <p className="claimGift-successSub" style={{ color: textColor }}>
            The funds have been added to your wallet.
          </p>
          <CustomButton
            actionFunction={() => navigate("/wallet", { replace: true })}
            textContent="Done"
            buttonStyles={{
              // ...CENTER,
              width: "auto",
            }}
          />
        </div>
      </div>
    );
  }

  if (error && !giftDetails) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-header">
          <button
            className="claimGift-backBtn"
            style={{ color: textColor }}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <p className="claimGift-title" style={{ color: textColor }}>
            {claimType === "claim" ? "Claim Gift" : "Reclaim Gift"}
          </p>
        </div>
        <div className="claimGift-notFound">
          <p style={{ color: textColor, fontSize: 48 }}>😕</p>
          <p style={{ color: textColor, fontWeight: 600 }}>{error}</p>
          <CustomButton
            actionFunction={() => navigate(-1)}
            textContent="Go Back"
            buttonStyles={{
              // ...CENTER,
              width: "auto",
            }}
          />
        </div>
      </div>
    );
  }

  const headerText = claimType === "reclaim" ? "Reclaim Gift" : "Claim Gift";
  const amountHeaderText =
    claimType === "reclaim"
      ? expertMode
        ? "Gift Index"
        : "Reclaimable Amount"
      : "Gift Amount";
  const amountDescriptionText = expertMode
    ? "The exact amount received may differ due to network fees."
    : "A small network fee will be deducted from this amount.";
  const buttonText = isClaiming
    ? "Claiming..."
    : claimType === "reclaim"
      ? "Reclaim Funds"
      : "Claim Gift";

  return (
    <div className="claimGift-container" style={{ backgroundColor }}>
      <p className="claimGift-headerText" style={{ color: textColor }}>
        {headerText}
      </p>
      <div className="claimGift-divider" style={{ backgroundColor: cardBg }} />

      {isClaiming ? (
        <div className="claimGift-loading">
          <div className="claimGift-spinner" />
          <p className="claimGift-claimingMessage" style={{ color: textColor }}>
            {claimStatus || "Claiming..."}
          </p>
        </div>
      ) : (
        <>
          {giftDetails?.description && claimType === "claim" && (
            <div
              className="claimGift-messageCard"
              style={{ backgroundColor: cardBg }}
            >
              <p
                className="claimGift-messageLabel"
                style={{ color: textColor }}
              >
                Message
              </p>
              <p className="claimGift-messageText" style={{ color: textColor }}>
                {giftDetails.description}
              </p>
            </div>
          )}

          <div
            className="claimGift-amountCard"
            style={{ backgroundColor: cardBg }}
          >
            <p className="claimGift-amountHeader" style={{ color: textColor }}>
              {amountHeaderText}
            </p>
            <div className="claimGift-amountValue">
              {expertMode ? (
                <p
                  style={{
                    color: textColor,
                    fontWeight: 700,
                    fontSize: 28,
                    margin: 0,
                  }}
                >
                  #{customGiftIndex}
                </p>
              ) : (
                <FormattedSatText
                  balance={giftDetails?.amount || 0}
                  styles={{
                    color: textColor,
                    fontWeight: 700,
                    fontSize: "28px",
                  }}
                />
              )}
            </div>
            <p
              className="claimGift-amountDescription"
              style={{ color: textColor }}
            >
              {amountDescriptionText}
            </p>
          </div>

          {error && <p className="claimGift-error">{error}</p>}

          <CustomButton
            actionFunction={handleClaim}
            textContent={buttonText}
            buttonStyles={{
              // ...CENTER,
              width: "auto",
            }}
            disabled={isClaiming}
          />
        </>
      )}
    </div>
  );
}
