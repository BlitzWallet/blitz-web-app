import {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useKeysContext } from "./keysContext";
import { useAppStatus } from "./appStatus";
import loadNewFiatData from "../functions/saveAndUpdateFiatData";
import { connectToLiquidNode } from "../functions/connectToLiquid";
import { useGlobalContextProvider } from "./masterInfoObject";

// Initiate context
const NodeContextManager = createContext(null);

const GLobalNodeContextProider = ({ children }) => {
  const { contactsPrivateKey, publicKey, accountMnemoinc } = useKeysContext();
  const { didGetToHomepage } = useAppStatus();
  const { masterInfoObject } = useGlobalContextProvider();
  const [nodeInformation, setNodeInformation] = useState({
    didConnectToNode: null,
    transactions: [],
    userBalance: 0,
    inboundLiquidityMsat: 0,
    blockHeight: 0,
    onChainBalance: 0,
    fiatStats: {},
    lsp: [],
  });
  const [liquidNodeInformation, setLiquidNodeInformation] = useState({
    didConnectToNode: null,
    transactions: [],
    userBalance: 0,
  });
  const [fiatStats, setFiatStats] = useState({});
  const toggleFiatStats = useCallback((newInfo) => {
    setFiatStats((prev) => ({ ...prev, ...newInfo }));
  }, []);

  const selectedCurrency = masterInfoObject.fiatCurrency;

  const didRunCurrencyUpdate = useRef(null);
  const didRunLiquidConnection = useRef(null);

  const toggleLiquidNodeInformation = useCallback((newInfo) => {
    setLiquidNodeInformation((prev) => ({ ...prev, ...newInfo }));
  }, []);

  useEffect(() => {
    if (
      !contactsPrivateKey ||
      !publicKey ||
      didRunCurrencyUpdate.current ||
      !selectedCurrency ||
      !didGetToHomepage
    )
      return;
    didRunCurrencyUpdate.current = true;

    async function initFiatData() {
      const response = await loadNewFiatData(
        selectedCurrency,
        contactsPrivateKey,
        publicKey,
        masterInfoObject
      );
      if (response.didWork && !response.usingCache) {
        toggleFiatStats(response.fiatRateResponse);
      }
    }
    initFiatData();
  }, [contactsPrivateKey, selectedCurrency, publicKey, didGetToHomepage]);

  useEffect(() => {
    if (
      !contactsPrivateKey ||
      !publicKey ||
      didRunLiquidConnection.current ||
      !didGetToHomepage ||
      import.meta.env.MODE === "development"
    )
      return;
    didRunLiquidConnection.current = true;

    async function connectToLiquid() {
      const connectionResponse = await connectToLiquidNode(accountMnemoinc);
      console.log("liquid connection response", connectionResponse);
      if (connectionResponse.isConnected) {
        toggleLiquidNodeInformation({
          didConnectToNode: true,
        });
      }
    }
    connectToLiquid();
  }, [contactsPrivateKey, publicKey, didGetToHomepage, accountMnemoinc]);

  const contextValue = useMemo(
    () => ({
      nodeInformation,
      liquidNodeInformation,
      toggleLiquidNodeInformation,
      toggleFiatStats,
      fiatStats,
    }),
    [
      nodeInformation,
      liquidNodeInformation,
      fiatStats,
      toggleFiatStats,
      toggleLiquidNodeInformation,
    ]
  );

  return (
    <NodeContextManager.Provider value={contextValue}>
      {children}
    </NodeContextManager.Provider>
  );
};

function useNodeContext() {
  const context = useContext(NodeContextManager);
  if (!context) {
    throw new Error(
      "useNodeContext must be used within a GLobalNodeContextProider"
    );
  }
  return context;
}

export { NodeContextManager, GLobalNodeContextProider, useNodeContext };
