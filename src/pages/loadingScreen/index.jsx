import { useEffect, useRef, useState } from "react";
import MascotWalking from "../../components/mascotWalking";
import "./style.css";
import ThemeText from "../../components/themeText/themeText";
import { useBitcoinPriceContext } from "../../contexts/bitcoinPriceContext";
import { useAuth } from "../../contexts/authContext";
import { useKeysContext } from "../../contexts/keysContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useGlobalAppData } from "../../contexts/appDataContext";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { initializeDatabase } from "../../functions/messaging/cachedMessages";
import { initializePOSTransactionsDatabase } from "../../functions/pos";
import { initializeSparkDatabase } from "../../functions/spark/transactions";
import { getCachedSparkTransactions } from "../../functions/spark";
import { useLiquidEvent } from "../../contexts/liquidEventContext";
import { useSpark } from "../../contexts/sparkContext";
import { useNavigate } from "react-router-dom";
import { useNodeContext } from "../../contexts/nodeContext.jsx";
import { Colors } from "../../constants/theme.js";
import { useThemeContext } from "../../contexts/themeContext.jsx";
import useThemeColors from "../../hooks/useThemeColors.js";
import loadNewFiatData from "../../functions/saveAndUpdateFiatData.js";
import Storage from "../../functions/localStorage.js";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import initializeUserSettingsFromHistory from "../../functions/initializeUserSettings";
import { privateKeyFromSeedWords } from "../../functions/nostrCompatability.js";
import {
  deriveSparkAddress,
  deriveSparkIdentityKey,
} from "../../functions/gift/deriveGiftWallet.js";
import { getPublicKey } from "../../functions/seed.js";
import { SparkReadonlyClient } from "@buildonspark/spark-sdk";

export default function LoadingScreen() {
  const didInitializeMessageIntervalRef = useRef(false);
  const didInitializeWalletRef = useRef(false);
  const didLoadInformation = useRef(false);
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
  const { toggleGlobalContactsInformation, globalContactsInformation } =
    useGlobalContacts();
  const didRunConnectionRef = useRef(false);
  const { t } = useTranslation();

  const { toggleGlobalAppDataInformation } = useGlobalAppData();

  const [loadingMessage, setLoadingMessage] = useState(
    "Please don't leave the tab",
  );
  const [hasError, setHasError] = useState("");

  useEffect(() => {
    if (didInitializeMessageIntervalRef.current) return;
    didInitializeMessageIntervalRef.current = true;

    const intervalRef = setInterval(() => {
      console.log("runngin in the interval");
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
        console.log("Process 1", new Date().getTime());
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

        const placeholderTxsPromise = getCachedSparkTransactions(
          20,
          identityPubKey.publicKeyHex,
        );

        const [placeholderTxs, { initialBalance, tokens }] = await Promise.all([
          placeholderTxsPromise,
          readonlyFetchPromise,
        ]);

        const hasSavedInfo = Object.keys(masterInfoObject || {}).length > 5; //arbitrary number but filters out onboarding items

        if (!hasSavedInfo) {
          const didLoadUserSettings = await initializeUserSettingsFromHistory({
            setMasterInfoObject,
            toggleGlobalContactsInformation,
            toggleGlobalAppDataInformation,
            toggleMasterInfoObject,
            preloadedData: preloadedUserData.data,
            setPreLoadedUserData,
            privateKey,
            publicKey,
          });

          console.log("Process 2", new Date().getTime());

          if (!didLoadUserSettings)
            throw new Error(
              t("screens.inAccount.loadingScreen.userSettingsError"),
            );
        }

        toggleContactsPrivateKey(privateKey);
        setSparkInformation((prev) => ({
          ...prev,
          transactions: placeholderTxs,
          balance: initialBalance,
          tokens,
        }));

        console.log("Process 3", new Date().getTime());

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(
          0,
          (hasSavedInfo ? 500 : 800) - elapsedTime,
        );

        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 60));
        }

        navigate("/wallet", { replace: true });
      } catch (err) {
        console.log("intializatiion error", err);
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
