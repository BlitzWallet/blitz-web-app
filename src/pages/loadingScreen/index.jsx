import { useEffect, useRef, useState } from "react";
import MascotWalking from "../../components/mascotWalking";
import "./style.css";
import ThemeText from "../../components/themeText/themeText";
import { useBitcoinPriceContext } from "../../contexts/bitcoinPriceContext";
import { useAuth } from "../../contexts/authContext";
import initializeUserSettings from "../../functions/initializeUserSettings";
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

export default function LoadingScreen() {
  const didInitializeMessageIntervalRef = useRef(false);
  const didInitializeWalletRef = useRef(false);
  const didLoadInformation = useRef(false);
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor } = useThemeColors();
  const { connectToSparkWallet } = useSpark();
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
    "Please don't leave the tab"
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
          : "Please don't leave the tab"
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

        const hasSavedInfo = Object.keys(masterInfoObject || {}).length > 5; //arbitrary number but filters out onboarding items

        if (!hasSavedInfo) {
          // connectToLiquidNode(accountMnemoinc);
          const [
            didOpen,
            giftCardTable,
            posTransactions,
            // sparkTxs,
            // rootstockSwaps,
          ] = await Promise.all([
            initializeDatabase(),
            initializePOSTransactionsDatabase(),
            initializeSparkDatabase(),
          ]);

          if (!didOpen || !posTransactions || !giftCardTable)
            throw new Error("Database initialization failed");

          const didLoadUserSettings = await initializeUserSettings({
            mnemoinc,
            toggleContactsPrivateKey,
            setMasterInfoObject,
            toggleGlobalContactsInformation,
            // toggleGLobalEcashInformation,
            toggleGlobalAppDataInformation,
            toggleMasterInfoObject,
            preloadedData: preloadedUserData.data,
            setPreLoadedUserData,
          });

          console.log("Process 2", new Date().getTime());

          if (!didLoadUserSettings)
            throw new Error(
              t("screens.inAccount.loadingScreen.userSettingsError")
            );
        }

        console.log("Process 3", new Date().getTime());

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(
          0,
          (hasSavedInfo ? 500 : 800) - elapsedTime
        );

        if (remainingTime > 0) {
          console.log(
            `Waiting ${remainingTime}ms to reach minimum 1s duration`
          );
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
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
      <div className="mascotContainer">
        <MascotWalking />
      </div>
      <ThemeText
        textStyles={{ color: theme ? textColor : Colors.light.blue }}
        textContent={hasError ? hasError : loadingMessage}
      />
    </div>
  );
}
