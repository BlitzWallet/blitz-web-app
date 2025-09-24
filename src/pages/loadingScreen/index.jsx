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
import { connectToLiquidNode } from "../../functions/connectToLiquid.js";
import { useSpark } from "../../contexts/sparkContext";
import { useNavigate } from "react-router-dom";
import { JsEventListener } from "../../functions/breezLiquid/JsEventListener.js";
import { useNodeContext } from "../../contexts/nodeContext.jsx";
import { Colors } from "../../constants/theme.js";
import { useThemeContext } from "../../contexts/themeContext.jsx";
import useThemeColors from "../../hooks/useThemeColors.js";
import loadNewFiatData from "../../functions/saveAndUpdateFiatData.js";
import Storage from "../../functions/localStorage.js";

export default function LoadingScreen() {
  const didInitializeMessageIntervalRef = useRef(false);
  const didInitializeWalletRef = useRef(false);
  const didLoadInformation = useRef(false);
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor } = useThemeColors();
  const {
    setStartConnectingToSpark,
    setNumberOfCachedTxs,
    connectToSparkWallet,
  } = useSpark();
  const { toggleMasterInfoObject, masterInfoObject, setMasterInfoObject } =
    useGlobalContextProvider();
  const { mnemoinc } = useAuth();
  const { toggleContactsPrivateKey, contactsPrivateKey, publicKey } =
    useKeysContext();
  const { toggleGlobalContactsInformation, globalContactsInformation } =
    useGlobalContacts();
  const { onLiquidBreezEvent } = useLiquidEvent();
  const { toggleGlobalAppDataInformation } = useGlobalAppData();
  const { setBitcoinPriceArray, toggleSelectedBitcoinPrice } =
    useBitcoinPriceContext();
  const { toggleFiatStats, toggleLiquidNodeInformation } = useNodeContext();
  const [loadingMessage, setLoadingMessage] = useState(
    "Please don't leave the tab"
  );
  const [hasError, setHasError] = useState("");
  const [didOpenDatabases, setDidOpenDatabases] = useState(false);
  const liquidNodeConnectionRef = useRef(null);
  const numberOfCachedTransactionsRef = useRef(null);

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
    async function retriveExternalData() {
      try {
        connectToSparkWallet();
        const [didOpen, posTransactions, sparkTxs] = await Promise.all([
          initializeDatabase(),
          initializePOSTransactionsDatabase(),
          initializeSparkDatabase(),
        ]);
        if (!didOpen || !posTransactions || !sparkTxs)
          throw new Error("Database initialization failed");

        const listener = new JsEventListener(onLiquidBreezEvent);
        const [didConnectToLiquidNode, txs, initWallet] = await Promise.all([
          import.meta.env.MODE === "development"
            ? Promise.resolve({ isConnected: true })
            : connectToLiquidNode(mnemoinc, listener),
          getCachedSparkTransactions(),
          initializeUserSettings(
            mnemoinc,
            toggleContactsPrivateKey,
            setMasterInfoObject,
            toggleGlobalContactsInformation,
            toggleGlobalAppDataInformation
          ),
        ]);
        console.log(didConnectToLiquidNode, txs, initWallet);

        if (!initWallet) throw new Error("Error loading user profile");
        liquidNodeConnectionRef.current = didConnectToLiquidNode;
        numberOfCachedTransactionsRef.current = txs;
        setDidOpenDatabases(true);
      } catch (err) {
        setHasError(err.message);
      }
    }
    if (!mnemoinc) return;
    if (didInitializeWalletRef.current) return;
    didInitializeWalletRef.current = true;
    retriveExternalData();
  }, [mnemoinc]);

  useEffect(() => {
    if (
      Object.keys(masterInfoObject).length === 0 ||
      didLoadInformation.current ||
      Object.keys(globalContactsInformation).length === 0 ||
      !didOpenDatabases
    )
      return;
    didLoadInformation.current = true;

    initWallet(
      liquidNodeConnectionRef.current,
      numberOfCachedTransactionsRef.current
    );
  }, [masterInfoObject, globalContactsInformation]);

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
  async function initWallet(didConnectToLiquidNode, txs) {
    console.log("HOME RENDER BREEZ EVENT FIRST LOAD");

    try {
      setStartConnectingToSpark(true);
      console.log(txs, "CACHED TRANSACTIONS");
      setNumberOfCachedTxs(txs?.length || 0);
      // if (import.meta.env.MODE === "development") {
      //   navigate("/wallet", { replace: true });
      //   return;
      // }

      if (didConnectToLiquidNode.isConnected) {
        const didSetLiquid = await setLiquidNodeInformationForSession(
          didConnectToLiquidNode.sdk
        );

        // Same thing for here, if liquid does not set continue on in the process
        if (didSetLiquid) {
          navigate("/wallet", { replace: true });
        } else
          throw new Error(
            "Wallet information was not set properly, please try again."
          );
      } else {
        throw new Error(
          "We were unable to set up your wallet. Please try again."
        );
      }
    } catch (err) {
      setHasError(String(err.message));
      console.log(err, "homepage connection to node err");
    }
  }

  async function setupFiatCurrencies() {
    const currency = masterInfoObject.fiatCurrency;

    let fiatRate;
    try {
      fiatRate = await loadNewFiatData(
        currency,
        contactsPrivateKey,
        publicKey,
        masterInfoObject
      );

      if (!fiatRate.didWork) {
        // fallback API
        const response = await fetch(import.meta.env.FALLBACK_FIAT_PRICE_DATA);
        const data = await response.json();
        if (data[currency]?.["15m"]) {
          // ✅ 4. Store in new format
          Storage.setItem("didFetchFiatRateToday", {
            lastFetched: new Date().getTime(),
            fiatRate: {
              coin: currency,
              value: data[currency]?.["15m"],
            },
          });
          Storage.setItem("cachedBitcoinPrice", {
            coin: currency,
            value: data[currency]?.["15m"],
          });

          fiatRate = {
            coin: currency,
            value: data[currency]?.["15m"],
          };
        } else {
          fiatRate = {
            coin: currency,
            value: 100_000, // random number to make sure nothing else down the line errors out
          };
        }
      } else fiatRate = fiatRate.fiatRateResponse;
    } catch (error) {
      console.error("Failed to fetch fiat data:", error);
      return { coin: "USD", value: 100_000 };
    }

    return fiatRate;
  }

  async function setLiquidNodeInformationForSession(sdkInstance) {
    try {
      const [fiat_rate] = await Promise.all([setupFiatCurrencies(sdkInstance)]);

      toggleFiatStats({ ...fiat_rate });

      toggleLiquidNodeInformation({
        didConnectToNode: true,
      });

      return true;
    } catch (err) {
      console.log(err, "LIQUID INFORMATION ERROR");
      return false;
    }
  }
}
