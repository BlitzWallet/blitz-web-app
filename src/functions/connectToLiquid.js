import init, {
  connect,
  defaultConfig,
  setLogger,
} from "@breeztech/breez-sdk-liquid/web";

let didConnect = false;
let sdkInstance = null;

// Call this once before using the SDK
export async function connectToLiquidNode(mnemonic, listener) {
  if (didConnect && sdkInstance) {
    return {
      isConnected: true,
      sdk: sdkInstance,
      reason: null,
    };
  }

  try {
    await init(); // initialize the wasm module first

    const network =
      import.meta.env.VITE_BOLTZ_ENVIRONMENT === "testnet"
        ? "testnet"
        : "mainnet";

    const config = defaultConfig(
      network,
      import.meta.env.VITE_LIQUID_BREEZ_KEY
    );

    sdkInstance = await connect({ mnemonic, config });

    if (listener) {
      sdkInstance.addEventListener(listener);
    }

    didConnect = true;

    return {
      isConnected: true,
      sdk: sdkInstance,
      reason: null,
    };
  } catch (err) {
    console.error("Error connecting to Breez Liquid SDK:", err);
    return {
      isConnected: false,
      sdk: null,
      reason: err.message,
    };
  }
}

// Optional getter
export function getLiquidSdk() {
  if (!sdkInstance) {
    throw new Error("Liquid SDK is not connected.");
  }
  return sdkInstance;
}
