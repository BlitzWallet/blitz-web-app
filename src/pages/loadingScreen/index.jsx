import { useEffect, useRef, useState } from "react";
import MascotWalking from "../../components/mascotWalking";
import "./style.css";
import ThemeText from "../../components/themeText/themeText";
import { useAuth } from "../../contexts/authContext";
import { useKeysContext } from "../../contexts/keysContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useGlobalAppData } from "../../contexts/appDataContext";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { getCachedSparkTransactions } from "../../functions/spark";
import { useSpark } from "../../contexts/sparkContext";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme.js";
import { useThemeContext } from "../../contexts/themeContext.jsx";
import useThemeColors from "../../hooks/useThemeColors.js";
import Storage from "../../functions/localStorage.js";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import initializeUserSettingsFromHistory from "../../functions/initializeUserSettings";
import { privateKeyFromSeedWords } from "../../functions/nostrCompatability.js";
import { deriveSparkIdentityKey } from "../../functions/gift/deriveGiftWallet.js";
import { getPublicKey } from "../../functions/seed.js";
import { SparkReadonlyClient } from "@buildonspark/spark-sdk";
import { deriveSparkAddress } from "../../functions/gift/deriveGiftWallet.js";
import {
  BALANCE_SNAPSHOT_KEY,
  PERSISTED_LOGIN_COUNT_KEY,
} from "../../constants";

export default function LoadingScreen() {
  const didInitializeMessageIntervalRef = useRef(false);
  const didRunConnectionRef = useRef(false);
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor } = useThemeColors();
  const { connectToSparkWallet, setSparkInformation } = useSpark();
  const {
    toggleMasterInfoObject,
    masterInfoObject,
    setMasterInfoObject,
    preloadedUserData,
    setPreLoadedUserData,
  } = useGlobalContextProvider();
  const { mnemoinc } = useAuth();
  const { toggleContactsPrivateKey } = useKeysContext();
  const { toggleGlobalContactsInformation } = useGlobalContacts();
  const { toggleGlobalAppDataInformation } = useGlobalAppData();
  const { t } = useTranslation();

  const [loadingMessage, setLoadingMessage] = useState(
    "Please don't leave the tab",
  );
  const [hasError, setHasError] = useState("");

  useEffect(() => {
    if (didInitializeMessageIntervalRef.current) return;
    didInitializeMessageIntervalRef.current = true;

    const intervalRef = setInterval(() => {
      setLoadingMessage((prev) =>
        prev === "Please don't leave the tab"
          ? "We are setting things up"
          : "Please don't leave the tab",
      );
    }, 5000);

    return () => clearInterval(intervalRef);
  }, []);

  useEffect(() => {
    async function startConnectProcess() {
      const startTime = Date.now();

      try {
        Storage.removeItem(PERSISTED_LOGIN_COUNT_KEY);

        // ── Phase 1: Start wallet connection + derive keys in parallel ────
        connectToSparkWallet();

        const [privateKey, identityPubKey] = await Promise.all([
          privateKeyFromSeedWords(mnemoinc),
          deriveSparkIdentityKey(mnemoinc),
        ]);

        const sparkAddress = deriveSparkAddress(identityPubKey.publicKey);
        const publicKey = privateKey ? getPublicKey(privateKey) : null;

        if (!privateKey || !publicKey)
          throw new Error(
            t("screens.inAccount.loadingScreen.userSettingsError"),
          );

        const hasSavedInfo = Object.keys(masterInfoObject || {}).length > 5;

        // ── Phase 2: Cache reads + readonly balance + settings init all in parallel ──
        const READONLY_TIMEOUT_MS = 6000;

        const readonlyFetchPromise = Promise.race([
          (async () => {
            try {
              const client = await SparkReadonlyClient.createWithMasterKey(
                { network: "MAINNET" },
                mnemoinc,
              );
              const [balance, tokenMap] = await Promise.all([
                client.getAvailableBalance(sparkAddress.address),
                client.getTokenBalance(sparkAddress.address),
              ]);

              const tokens = {};
              for (const [tokenId, info] of tokenMap) {
                tokens[tokenId] = {
                  balance: info.availableToSendBalance,
                  tokenMetadata: info.tokenMetadata,
                };
              }

              return { initialBalance: Number(balance), tokens };
            } catch (err) {
              console.log("Readonly balance fetch failed (non-fatal):", err);
              return { initialBalance: 0, tokens: {} };
            }
          })(),
          new Promise((resolve) =>
            setTimeout(() => {
              console.log(
                "Readonly balance fetch timed out — proceeding with defaults",
              );
              resolve({ initialBalance: 0, tokens: {} });
            }, READONLY_TIMEOUT_MS),
          ),
        ]);

        const [
          placeholderTxs,
          balanceSnapshot,
          readonlyResult,
          didLoadUserSettings,
        ] = await Promise.all([
          getCachedSparkTransactions(20, identityPubKey.publicKeyHex),
          Promise.resolve(Storage.getItem(BALANCE_SNAPSHOT_KEY)),
          readonlyFetchPromise,
          hasSavedInfo
            ? Promise.resolve(true)
            : initializeUserSettingsFromHistory({
                setMasterInfoObject,
                toggleGlobalContactsInformation,
                toggleGlobalAppDataInformation,
                toggleMasterInfoObject,
                preloadedData: preloadedUserData.data,
                setPreLoadedUserData,
                privateKey,
                publicKey,
              }),
        ]);

        if (!hasSavedInfo) {
          if (!didLoadUserSettings)
            throw new Error(
              t("screens.inAccount.loadingScreen.userSettingsError"),
            );
        }

        toggleContactsPrivateKey(privateKey);

        console.log(balanceSnapshot, placeholderTxs);

        // ── Phase 3: Apply cached balance snapshot, topped up by readonly fetch ──
        if (balanceSnapshot) {
          try {
            const cached = JSON.parse(balanceSnapshot);
            setSparkInformation((prev) => ({
              ...prev,
              transactions: placeholderTxs,
              ...cached,
              // Readonly fetch wins over the snapshot if it returned a real balance
              ...(readonlyResult.initialBalance > 0
                ? {
                    balance: readonlyResult.initialBalance,
                    tokens: readonlyResult.tokens,
                  }
                : {}),
            }));
          } catch (err) {
            console.log("Error parsing cached balance", err);
            setSparkInformation((prev) => ({
              ...prev,
              transactions: placeholderTxs,
              balance: readonlyResult.initialBalance,
              tokens: readonlyResult.tokens,
            }));
          }
        } else {
          setSparkInformation((prev) => ({
            ...prev,
            transactions: placeholderTxs,
            balance: readonlyResult.initialBalance,
            tokens: readonlyResult.tokens,
          }));
        }

        // ── Phase 4: Minimum perceived loading time then navigate ─────────
        const elapsed = Date.now() - startTime;
        const minDuration = hasSavedInfo ? 500 : 1500;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(60, minDuration - elapsed)),
        );

        navigate("/wallet", { replace: true });
      } catch (err) {
        console.log("initialization error", err);
        setHasError(err.message);
      }
    }

    if (preloadedUserData.isLoading && !preloadedUserData.data) return;
    if (didRunConnectionRef.current) return;
    didRunConnectionRef.current = true;

    startConnectProcess();
  }, [preloadedUserData, masterInfoObject]);

  return (
    <div id="loadingScreenContainer">
      {!!hasError && (
        <Settings
          className="doomsday"
          onClick={() => navigate("/settings", { state: { isDoomsday: true } })}
          style={{ cursor: "pointer" }}
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      )}
      <div className="mascotContainer">
        <MascotWalking />
      </div>
      {hasError && (
        <ThemeText
          textStyles={{
            color: theme ? textColor : Colors.light.blue,
            textAlign: "center",
          }}
          textContent={hasError ? hasError : loadingMessage}
        />
      )}
    </div>
  );
}
