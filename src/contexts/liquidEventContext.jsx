import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import startLiquidUpdateInterval from "../functions/liquidBackupUpdate";
import { useNodeContext } from "./nodeContext";
const LiquidEventContext = createContext(null);

// Create a context for the WebView ref
export function LiquidEventProvider({ children }) {
  const { toggleLiquidNodeInformation, liquidNodeInformation } =
    useNodeContext();
  const initialLiquidRun = useRef(null);
  const intervalId = useRef(null);
  const debounceTimer = useRef(null);

  const isInitialSync = useRef(true);
  const syncRunCounter = useRef(1);

  useEffect(() => {
    if (!liquidNodeInformation.didConnectToNode) return;
    if (initialLiquidRun.current) return;
    initialLiquidRun.current = true;
    intervalId.current = startLiquidUpdateInterval(
      toggleLiquidNodeInformation,
      3
    );
  }, [liquidNodeInformation.didConnectToNode]);

  const debouncedStartInterval = (intervalCount) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (intervalId.current) clearInterval(intervalId.current);
      intervalId.current = startLiquidUpdateInterval(
        toggleLiquidNodeInformation,
        intervalCount
      );
    }, 2000);
  };

  const onLiquidBreezEvent = useCallback((title, text) => {
    console.log("Liquid SDK Event:", title, text);
    if (!text) return;
    const event = JSON.parse(text);

    if (event.type !== "Synced") {
      debouncedStartInterval(event.type === "PaymentSucceeded" ? 1 : 0);
    } else {
      console.log(
        `Synced event #${syncRunCounter.current}, isInitialSync=${isInitialSync.current}`
      );
    }
  }, []);

  return (
    <LiquidEventContext.Provider
      value={{
        onLiquidBreezEvent,
      }}
    >
      {children}
    </LiquidEventContext.Provider>
  );
}
export const useLiquidEvent = () => {
  return useContext(LiquidEventContext); // Use the correct context
};
