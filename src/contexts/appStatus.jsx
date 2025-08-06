import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { getBoltzSwapPairInformation } from "../functions/boltz/boltzSwapInfo";

// Initiate context
const AppStatusManager = createContext(null);

const AppStatusProvider = ({ children }) => {
  const [minMaxLiquidSwapAmounts, setMinMaxLiquidSwapAmounts] = useState({
    min: 1000,
    max: 25000000,
  });

  const [isConnectedToTheInternet, setIsConnectedToTheInternet] =
    useState(true);

  const [didGetToHomepage, setDidGetToHomePage] = useState(false);
  const [appState, setAppState] = useState("active");

  const toggleDidGetToHomepage = useCallback((newInfo) => {
    setDidGetToHomePage(newInfo);
  }, []);
  const toggleMinMaxLiquidSwapAmounts = useCallback((newInfo) => {
    setMinMaxLiquidSwapAmounts((prev) => ({ ...prev, ...newInfo }));
  }, []);

  useEffect(() => {
    (async () => {
      const [reverseSwapStats, submarineSwapStats] = await Promise.all([
        getBoltzSwapPairInformation("ln-liquid"),
        getBoltzSwapPairInformation("liquid-ln"),
      ]);
      const min = reverseSwapStats?.limits?.minimal || 1000;
      const max = reverseSwapStats?.limits?.maximal || 25000000;
      if (reverseSwapStats) {
        toggleMinMaxLiquidSwapAmounts({
          reverseSwapStats,
          submarineSwapStats,
          min,
          max,
        });
      }
    })();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log("App state changed to:", nextAppState);
      setAppState(nextAppState);
    };

    window.addEventListener("blur", () => {
      handleAppStateChange("background");
    });
    window.addEventListener("focus", () => {
      handleAppStateChange("active");
    });
    window.addEventListener("beforeunload", () => {
      handleAppStateChange("background");
    });
  }, []);

  console.log(minMaxLiquidSwapAmounts, "min max liquid swap amounts");

  const contextValue = useMemo(
    () => ({
      minMaxLiquidSwapAmounts,
      toggleMinMaxLiquidSwapAmounts,
      isConnectedToTheInternet,
      didGetToHomepage,
      toggleDidGetToHomepage,
      appState,
    }),
    [
      minMaxLiquidSwapAmounts,
      toggleMinMaxLiquidSwapAmounts,
      isConnectedToTheInternet,
      didGetToHomepage,
      toggleDidGetToHomepage,
      appState,
    ]
  );

  return (
    <AppStatusManager.Provider value={contextValue}>
      {children}
    </AppStatusManager.Provider>
  );
};

function useAppStatus() {
  const context = useContext(AppStatusManager);
  if (!context) {
    throw new Error("useAppStatus must be used within a AppStatusProvider");
  }
  return context;
}

export { AppStatusManager, AppStatusProvider, useAppStatus };
