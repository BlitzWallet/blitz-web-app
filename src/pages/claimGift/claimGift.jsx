import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lottie from "lottie-react";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useKeysContext } from "../../contexts/keysContext";
import { useGifts } from "../../contexts/giftsContext";
import { useSpark } from "../../contexts/sparkContext";
import {
  STARTING_INDEX_FOR_GIFTS_DERIVE,
  GIFT_DERIVE_PATH_CUTOFF,
  WEBSITE_REGEX,
  USDB_TOKEN_ID,
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
import { bulkUpdateSparkTransactions } from "../../functions/spark/transactions";
import { dollarsToSats } from "../../functions/spark/flashnet";
import { useFlashnet } from "../../contexts/flashnetContext";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import CustomButton from "../../components/customButton/customButton";
import ThemeText from "../../components/themeText/themeText";
import confirmTxAnimation from "../../assets/confirmTxAnimation.json";
import { updateConfirmAnimation } from "../../functions/lottieViewColorTransformer";
import "./claimGift.css";

/**
 * Web + mobile compatibility:
 * - BTC sats: prefer result.satsBalance.available, fallback result.balance
 * - USD micro-units: result.tokensObj?.[USDB_TOKEN_ID]?.balance (mobile) OR result.tokenBalances Map (web)
 */
function getSparkBalanceAmount(result, denomination) {
  console.log("result", result);
  if (!result) return 0;

  // Some SDKs include didWork; some don't.
  if (typeof result.didWork === "boolean" && !result.didWork) return 0;

  const toNum = (v) => {
    if (v == null) return 0;
    if (typeof v === "bigint") return Number(v);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  if (denomination === "USD") {
    const tok = result.tokensObj?.[USDB_TOKEN_ID];
    console.log("tok", tok);
    if (tok) {
      const raw = tok.balance ?? tok.availableToSendBalance ?? tok.ownedBalance;
      return toNum(raw);
    }

    const map = result.tokenBalances;
    if (map && typeof map.get === "function") {
      const entry = map.get(USDB_TOKEN_ID);
      if (entry?.balance != null) return toNum(entry.balance);
      if (entry?.availableToSendBalance != null)
        return toNum(entry.availableToSendBalance);
      return toNum(entry);
    }

    return 0;
  }

  const available = result.satsBalance?.available;
  if (available != null) return toNum(available);

  return toNum(result.balance);
}

export default function ClaimGiftScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundColor, backgroundOffset } = useThemeColors();

  const { poolInfoRef } = useFlashnet();
  const { accountMnemoinc } = useKeysContext();
  const { sparkInformation } = useSpark();
  const { updateGiftState, refreshGifts } = useGifts();

  const {
    claimType = "claim",
    url,
    giftUuid,
    expertMode,
    customGiftIndex,
  } = location.state || {};

  const [giftDetails, setGiftDetails] = useState({});
  const [isClaiming, setIsClaiming] = useState(false);
  const [didClaim, setDidClaim] = useState(false);
  const [claimStatus, setClaimStatus] = useState("");
  const [error, setError] = useState("");

  // Store the initialization promise and result (mobile pattern)
  const walletInitPromise = useRef(null);
  const walletInitResult = useRef(null);
  const isClaimingRef = useRef(false);

  const denomination = giftDetails?.denomination || "BTC";

  const handleError = useCallback(
    (errorMessage) => {
      // mobile navigates to ErrorScreen; web uses inline error state
      setError(
        errorMessage || t("screens.inAccount.giftPages.claimPage.paymentError"),
      );
    },
    [t],
  );

  const deriveReclaimGiftSeed = useCallback(async () => {
    if (expertMode) {
      const giftWalletMnemonic = await deriveSparkGiftMnemonic(
        accountMnemoinc,
        STARTING_INDEX_FOR_GIFTS_DERIVE + customGiftIndex,
      );
      return { giftSeed: giftWalletMnemonic.derivedMnemonic };
    }

    let uuidLocal;
    if (WEBSITE_REGEX.test(url)) {
      const parsedURL = parseGiftUrl(url);
      uuidLocal = parsedURL.giftId;
    } else {
      uuidLocal = url;
    }

    const savedGift = await getGiftByUuid(uuidLocal);

    if (!savedGift) {
      throw new Error(t("screens.inAccount.giftPages.claimPage.parseError"));
    }

    if (Date.now() < savedGift.expireTime) {
      throw new Error(t("screens.inAccount.giftPages.claimPage.notExpired"));
    }

    let giftWalletMnemonic;
    if (savedGift.createdTime > GIFT_DERIVE_PATH_CUTOFF) {
      giftWalletMnemonic = await deriveSparkGiftMnemonic(
        accountMnemoinc,
        savedGift.giftNum,
      );
    } else {
      giftWalletMnemonic = await deriveKeyFromMnemonic(
        accountMnemoinc,
        savedGift.giftNum,
      );
    }

    return { ...savedGift, giftSeed: giftWalletMnemonic.derivedMnemonic };
  }, [expertMode, accountMnemoinc, customGiftIndex, url, giftUuid, t]);

  const deriveClaimGiftSeed = useCallback(async () => {
    const parsedURL = parseGiftUrl(url);
    if (!parsedURL) {
      throw new Error(t("screens.inAccount.giftPages.claimPage.parseError"));
    }

    const retrivedGift = await getGiftCard(parsedURL.giftId);
    if (!retrivedGift || retrivedGift?.expireTime < Date.now()) {
      throw new Error(
        t("screens.inAccount.giftPages.claimPage.expiredOrClaimed"),
      );
    }

    const publicKey = getPublicKey(parsedURL.secret);
    const decodedSeed = await decryptMessage(
      parsedURL.secret,
      publicKey,
      retrivedGift.encryptedText,
    );

    if (!decodedSeed || decodedSeed.split(" ").length < 5) {
      throw new Error(t("screens.inAccount.giftPages.claimPage.noGiftSeed"));
    }

    return { ...retrivedGift, giftSeed: decodedSeed };
  }, [url, t]);

  const loadGiftDetails = useCallback(async () => {
    try {
      const details =
        claimType === "reclaim"
          ? await deriveReclaimGiftSeed()
          : await deriveClaimGiftSeed();

      setGiftDetails(details);
      console.log("details", details);
      console.log(import.meta.env.VITE_MODE);
      // Pre-initialize wallet in background (mobile pattern)
      walletInitPromise.current = initializeSparkWallet(details.giftSeed)
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
      console.log("error loading gift details", err);
      handleError(err?.message);
    }
  }, [claimType, deriveReclaimGiftSeed, deriveClaimGiftSeed, handleError]);

  const getBalanceWithStatusRetry = useCallback(
    async (seed, expectedAmount, shouldEnforceAmount = false) => {
      console.log("seed", seed);
      const delays = [5000, 7000, 8000];
      let attempt = 0;

      setClaimStatus(
        t("screens.inAccount.giftPages.claimPage.giftBalanceMessage_0"),
      );

      let result = await getSparkBalance(seed);

      console.log("result", result);

      const handleBalanceCheck = (res) => {
        // Web/mobile normalization
        const btcBal = getSparkBalanceAmount(res, "BTC");
        const usdBal = getSparkBalanceAmount(res, "USD");
        console.log("btcBal", btcBal);
        if (expectedAmount === undefined || expectedAmount === null) {
          // expert mode path: any balance is fine
          return denomination === "BTC" ? btcBal > 0 : usdBal > 0;
        }

        const bitcoinCheck = btcBal >= Number(expectedAmount) * 0.97;
        const dollarCheck = usdBal >= Number(expectedAmount) * 1e6 * 0.97;
        console.log("dollarCheck", dollarCheck);
        console.log("denomination", denomination);
        console.log("usdBal", usdBal);
        console.log("expectedAmount", expectedAmount * 1e6 * 0.97);
        return denomination === "BTC" ? bitcoinCheck : dollarCheck;
      };

      console.log("handleBalanceCheck", handleBalanceCheck(result));
      if (handleBalanceCheck(result)) return result;

      for (const delay of delays) {
        attempt += 1;
        setClaimStatus(
          t("screens.inAccount.giftPages.claimPage.giftBalanceMessage", {
            context: attempt,
          }),
        );

        await new Promise((res) => setTimeout(res, delay));

        result = await getSparkBalance(seed);
        console.log("result", result);
        if (handleBalanceCheck(result)) return result;
      }

      if (
        shouldEnforceAmount &&
        expectedAmount !== undefined &&
        expectedAmount !== null &&
        !handleBalanceCheck(result)
      ) {
        const btcF = getSparkBalanceAmount(result, "BTC");
        const usdF = getSparkBalanceAmount(result, "USD");
        // Coordinator reported no sats and no tokens — not a "wrong amount" case.
        if (btcF === 0 && usdF === 0) {
          throw new Error(
            t("screens.inAccount.giftPages.claimPage.nobalanceError"),
          );
        }
        throw new Error(
          t("screens.inAccount.giftPages.claimPage.balanceMismatchError"),
        );
      }
      console.log("result", result);
      return result;
    },
    [t, denomination],
  );

  const ensureWalletInitialized = useCallback(
    async (giftSeed) => {
      let initResult = walletInitResult.current;

      if (walletInitPromise.current && !initResult) {
        initResult = await walletInitPromise.current;
      }

      if (!initResult) {
        initResult = await initializeSparkWallet(giftSeed);
      }
      if (!initResult) {
        throw new Error(
          t("screens.inAccount.giftPages.claimPage.giftWalletInitError"),
        );
      }

      return initResult;
    },
    [t],
  );

  const calculatePaymentAmount = useCallback(
    async (giftSeed, giftAmount) => {
      const walletBalance = await getBalanceWithStatusRetry(
        giftSeed,
        expertMode ? undefined : giftAmount,
        claimType === "claim",
      );

      console.log("giftSeed", giftSeed);
      console.log("walletBalance", walletBalance);

      const bitcoinBalance = walletBalance?.didWork
        ? Number(walletBalance?.balance)
        : 0;
      const dollarBalance = walletBalance?.didWork
        ? Number(walletBalance?.tokensObj?.[USDB_TOKEN_ID]?.balance) || 0
        : 0;
      const dollarGiftAmount = giftAmount * Math.pow(10, 6);

      let formattedWalletBalance;
      let fees;
      let fromBalance;

      if (expertMode) {
        if (!bitcoinBalance && !dollarBalance) {
          console.log(walletBalance?.balance);
          throw new Error(
            t("screens.inAccount.giftPages.claimPage.nobalanceErrorExpert"),
          );
        }
        formattedWalletBalance = bitcoinBalance || dollarBalance;
        fromBalance = bitcoinBalance ? "BTC" : "USD";
        fees = await (fromBalance === "USD"
          ? Promise.resolve(0)
          : getSparkPaymentFeeEstimate(formattedWalletBalance, giftSeed));
      } else {
        formattedWalletBalance = walletBalance?.didWork
          ? denomination === "BTC"
            ? bitcoinBalance
            : dollarBalance
          : giftAmount || 0;

        fees = await (denomination === "USD"
          ? Promise.resolve(
              dollarGiftAmount > formattedWalletBalance
                ? dollarGiftAmount - formattedWalletBalance
                : 0,
            )
          : getSparkPaymentFeeEstimate(formattedWalletBalance, giftSeed));
        fromBalance = denomination;
      }

      const sendingAmount =
        formattedWalletBalance - (fromBalance === "USD" ? 0 : fees);

      if (sendingAmount <= 0) {
        if (claimType === "reclaim" && !expertMode && giftDetails.uuid) {
          await deleteGift(giftDetails.uuid);
          await updateGiftLocal(giftDetails.uuid, { state: "Reclaimed" });
          updateGiftState(giftDetails.uuid, { state: "Reclaimed" });
          refreshGifts();
        }

        throw new Error(
          expertMode
            ? t("screens.inAccount.giftPages.claimPage.nobalanceErrorExpert")
            : t("screens.inAccount.giftPages.claimPage.nobalanceError"),
        );
      }

      const balanceDifference = expertMode
        ? 0
        : denomination === "USD"
          ? dollarGiftAmount > formattedWalletBalance
            ? dollarGiftAmount - formattedWalletBalance
            : 0
          : Number(giftAmount) > formattedWalletBalance
            ? Number(giftAmount) - formattedWalletBalance
            : 0;

      const finalFee = fees + balanceDifference;

      return { sendingAmount, fees: finalFee, fromBalance };
    },
    [
      getBalanceWithStatusRetry,
      expertMode,
      claimType,
      denomination,
      giftDetails.uuid,
      t,
      updateGiftState,
      refreshGifts,
    ],
  );

  const processTransaction = useCallback(
    async (
      paymentResponse,
      receivingAddress,
      sendingAmount,
      fees,
      paymentDenomination,
    ) => {
      const data = paymentResponse.response;

      const formattedToken = paymentDenomination === "USD" ? USDB_TOKEN_ID : "";
      const price = poolInfoRef?.currentPriceAInB;

      const fee =
        paymentDenomination === "USD"
          ? price
            ? dollarsToSats(fees / 1e6, price)
            : 0
          : fees;

      const tx = {
        id: paymentDenomination === "USD" ? data : data?.id,
        paymentStatus: "completed",
        paymentType: "spark",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee,
          totalFee: fee,
          supportFee: fee,
          amount: sendingAmount,
          address: receivingAddress,
          time:
            paymentDenomination === "USD"
              ? Date.now()
              : new Date(data?.updatedTime ?? Date.now()).getTime(),
          direction: "INCOMING",
          description:
            claimType === "reclaim"
              ? t("screens.inAccount.giftPages.reclaimGiftMessage")
              : giftDetails.description,
          senderIdentityPublicKey:
            paymentDenomination === "USD"
              ? ""
              : data?.receiverIdentityPublicKey,
          isLRC20Payment: paymentDenomination === "USD",
          LRC20Token: formattedToken,
          isGift: true,
        },
      };

      if (!tx.details.description) {
        tx.details.description = t(
          "screens.inAccount.giftPages.claimPage.defaultDesc",
        );
      }

      await bulkUpdateSparkTransactions([tx], "fullUpdate-waitBalance");

      if (!expertMode) {
        await deleteGift(giftDetails.uuid);
        if (claimType === "reclaim") {
          await updateGiftLocal(giftDetails.uuid, { state: "Reclaimed" });
        }
      }
    },
    [
      claimType,
      giftDetails.description,
      giftDetails.uuid,
      expertMode,
      poolInfoRef,
      sparkInformation.identityPubKey,
      t,
    ],
  );

  const handleClaim = useCallback(async () => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;
    setIsClaiming(true);
    setError("");

    try {
      setClaimStatus(
        t("screens.inAccount.giftPages.claimPage.claimingGiftMessage1"),
      );
      console.log("giftDetails", giftDetails);
      await ensureWalletInitialized(giftDetails.giftSeed);

      const receivingAddress = sparkInformation.sparkAddress;
      const { sendingAmount, fees, fromBalance } = await calculatePaymentAmount(
        giftDetails.giftSeed,
        denomination === "BTC" ? giftDetails.amount : giftDetails.dollarAmount,
      );
      console.log("fromBalance", fromBalance);
      console.log("sendingAmount", sendingAmount);
      console.log("fees", fees);
      setClaimStatus(
        t("screens.inAccount.giftPages.claimPage.claimingGiftMessage4"),
      );

      const paymentResponse = await (fromBalance === "BTC"
        ? sendSparkPayment({
            receiverSparkAddress: receivingAddress,
            amountSats: sendingAmount,
            mnemonic: giftDetails.giftSeed,
          })
        : sendSparkTokens({
            tokenIdentifier: USDB_TOKEN_ID,
            tokenAmount: sendingAmount,
            receiverSparkAddress: receivingAddress,
            mnemonic: giftDetails.giftSeed,
          }));

      if (!paymentResponse?.didWork) {
        throw new Error(
          t("screens.inAccount.giftPages.claimPage.paymentError"),
        );
      }

      await processTransaction(
        paymentResponse,
        receivingAddress,
        sendingAmount,
        fees,
        fromBalance,
      );

      if (!expertMode && giftDetails.uuid && claimType === "claim") {
        await updateGiftLocal(giftDetails.uuid, { state: "Claimed" });
        updateGiftState(giftDetails.uuid, { state: "Claimed" });
      }

      refreshGifts();
      setDidClaim(true);
    } catch (err) {
      console.log("Error claiming gift:", err);
      handleError(err?.message || "Failed to claim gift");
    } finally {
      setIsClaiming(false);
      isClaimingRef.current = false;
    }
  }, [
    t,
    ensureWalletInitialized,
    sparkInformation.sparkAddress,
    calculatePaymentAmount,
    processTransaction,
    giftDetails.giftSeed,
    giftDetails.amount,
    giftDetails.dollarAmount,
    giftDetails.uuid,
    denomination,
    claimType,
    expertMode,
    refreshGifts,
    updateGiftState,
    handleError,
  ]);

  useEffect(() => {
    if (!expertMode && !url && !giftUuid) return;

    const isConnected =
      sparkInformation.identityPubKey && sparkInformation.didConnect;
    if (isConnected) loadGiftDetails();
  }, [
    url,
    giftUuid,
    sparkInformation.identityPubKey,
    sparkInformation.didConnect,
    expertMode,
    loadGiftDetails,
  ]);

  // Cleanup on unmount (mobile pattern)
  useEffect(() => {
    return () => {
      walletInitPromise.current = null;
      walletInitResult.current = null;
      isClaimingRef.current = false;
    };
  }, []);

  const confirmAnimation = useMemo(
    () =>
      updateConfirmAnimation(
        confirmTxAnimation,
        theme ? (darkModeType ? "lightsOut" : "dark") : "light",
      ),
    [theme, darkModeType],
  );

  const containerBackgroundColor = useMemo(
    () => (theme && darkModeType ? backgroundColor : backgroundOffset),
    [theme, darkModeType, backgroundColor, backgroundOffset],
  );

  // ===== UI =====

  if (!sparkInformation.identityPubKey || !sparkInformation.didConnect) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-main claimGift-main--centered">
          <div className="claimGift-loading">
            <div className="claimGift-spinner" />
            <ThemeText
              textContent={t(
                "wallet.sendPages.sendPaymentScreen.connectToSparkMessage",
              )}
              textStyles={{ textAlign: "center", margin: 0 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!Object.keys(giftDetails).length && !error) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-main claimGift-main--centered">
          <div className="claimGift-loading">
            <div className="claimGift-spinner" />
            <ThemeText
              textContent={t("constants.loading")}
              textStyles={{ textAlign: "center", margin: 0 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (didClaim) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-success">
          <div className="claimGift-lottieWrap">
            <Lottie
              animationData={confirmAnimation}
              loop={false}
              autoplay
              className="claimGift-lottie"
            />
          </div>
          <ThemeText
            className="claimGift-confirmMessage"
            textContent={t(
              "screens.inAccount.giftPages.claimPage.confirmMessage",
            )}
            textStyles={{ textAlign: "center", margin: 0 }}
          />
          <div className="claimGift-successButtonWrap">
            <CustomButton
              actionFunction={() => navigate("/wallet", { replace: true })}
              textContent={t("constants.done")}
              buttonStyles={{ width: "auto" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error && !Object.keys(giftDetails).length) {
    return (
      <div className="claimGift-container" style={{ backgroundColor }}>
        <div className="claimGift-main">
          <div className="claimGift-header">
            <button
              type="button"
              className="claimGift-backBtn"
              style={{ color: textColor }}
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <ThemeText
              className="claimGift-title"
              textContent={
                claimType === "claim"
                  ? t("screens.inAccount.giftPages.claimPage.claimHead")
                  : t("screens.inAccount.giftPages.claimPage.reclaimHead")
              }
              textStyles={{ margin: 0 }}
            />
          </div>

          <div className="claimGift-notFound">
            <ThemeText
              textContent={error}
              textStyles={{ fontWeight: 600, textAlign: "center", margin: 0 }}
            />
            <CustomButton
              actionFunction={() => navigate(-1)}
              textContent={t("constants.back")}
              buttonStyles={{ width: "auto" }}
            />
          </div>
        </div>
      </div>
    );
  }

  const headerText =
    claimType === "reclaim"
      ? t("screens.inAccount.giftPages.claimPage.reclaimHead")
      : t("screens.inAccount.giftPages.claimPage.claimHead");

  const amountHeaderText =
    claimType === "reclaim"
      ? expertMode
        ? t("screens.inAccount.giftPages.claimPage.reclaimAmountHeadExpert")
        : t("screens.inAccount.giftPages.claimPage.reclaimAmountHead")
      : t("screens.inAccount.giftPages.claimPage.claimAmountHead");

  const amountDescriptionText = expertMode
    ? t("screens.inAccount.giftPages.claimPage.networkFeeWarningExpert")
    : t("screens.inAccount.giftPages.claimPage.networkFeeWarning");

  const buttonText = isClaiming
    ? t("screens.inAccount.giftPages.claimPage.buttonTextClaiming")
    : claimType === "reclaim"
      ? t("screens.inAccount.giftPages.claimPage.reclaimButton")
      : t("screens.inAccount.giftPages.claimPage.claimButton");

  const loadingText =
    claimStatus ||
    (claimType === "reclaim"
      ? t("screens.inAccount.giftPages.claimPage.reclaimLoading")
      : t("screens.inAccount.giftPages.claimPage.claimLoading"));

  return (
    <div className="claimGift-container" style={{ backgroundColor }}>
      <div className="claimGift-main">
        <ThemeText
          className="claimGift-headerText"
          textContent={headerText}
          textStyles={{
            fontSize: 20,
            fontWeight: 500,
            textAlign: "center",
            margin: 0,
            width: "100%",
          }}
        />

        <div
          className="claimGift-divider"
          style={{ backgroundColor: containerBackgroundColor }}
        />

        {isClaiming ? (
          <div className="claimGift-loading claimGift-loading--inline">
            <div className="claimGift-spinner" />
            <ThemeText
              className="claimGift-claimingMessage"
              textContent={loadingText}
              textStyles={{
                textAlign: "center",
                minHeight: 80,
                margin: 0,
                width: "100%",
              }}
            />
          </div>
        ) : (
          <>
            <div
              className="claimGift-amountCard"
              style={{ backgroundColor: containerBackgroundColor }}
            >
              <ThemeText
                className="claimGift-amountHeader"
                textContent={amountHeaderText}
                textStyles={{ textAlign: "center", margin: 0 }}
              />

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
                ) : denomination === "USD" ? (
                  <p
                    style={{
                      color: textColor,
                      fontWeight: 700,
                      fontSize: 28,
                      margin: 0,
                    }}
                  >
                    ${giftDetails?.dollarAmount ?? "0"} USD
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

              <ThemeText
                className="claimGift-amountDescription"
                textContent={amountDescriptionText}
                textStyles={{
                  textAlign: "center",
                  opacity: 0.6,
                  fontSize: 13,
                  lineHeight: "20px",
                  margin: 0,
                }}
              />
            </div>

            {error && <p className="claimGift-error">{error}</p>}

            <div className="claimGift-buttonWrap">
              <CustomButton
                actionFunction={handleClaim}
                textContent={buttonText}
                buttonStyles={{ width: "auto" }}
                disabled={isClaiming}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
