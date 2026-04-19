import { httpsCallable } from "firebase/functions";

import { functions } from "./initializeFirebase";
import {
  decryptMessage,
  encryptMessage,
} from "../src/functions/encodingAndDecoding";

/**
 * encodingAndDecoding.js prepends "02" to the pubkey internally,
 * so we must pass only the raw 64-char x-coordinate (no prefix).
 */
function getBackendPubKey64() {
  const raw = String(import.meta.env.VITE_BACKEND_PUB_KEY ?? "")
    .replace(/\s/g, "")
    .replace(/^0x/i, "")
    .toLowerCase();
  const hex = raw.replace(/[^0-9a-f]/g, "");
  if (hex.length === 64) return hex;
  if (hex.length === 66 && (hex.startsWith("02") || hex.startsWith("03")))
    return hex.slice(2);
  if (hex.length > 66) return hex.slice(2, 66);
  throw new Error(
    "VITE_BACKEND_PUB_KEY must be 64 hex chars or 66 with 02/03 prefix",
  );
}

export default async function fetchBackend(
  method,
  data,
  privateKey,
  publicKey,
) {
  try {
    const message = await encodeRequest(privateKey, data);

    if (!message) throw new Error("Unable to encode request");
    const responseData = {
      em: message,
      publicKey,
    };
    console.log("function call data", responseData);

    const response = await httpsCallable(functions, method)(responseData);

    console.log("Response", response);
    // Backend wraps the encrypted string in { token: "..." }
    const encryptedPayload =
      typeof response.data === "string" ? response.data : response.data?.token;
    if (!encryptedPayload) throw new Error("No encrypted payload in response");
    const dm = await decodeRequest(privateKey, encryptedPayload);
    console.log("decoded response", dm);

    return dm;
  } catch (err) {
    console.log("backend fetch wrapper error", err);
    return false;
  }
}

async function encodeRequest(privateKey, data) {
  try {
    const encription = await encryptMessage(
      privateKey,
      getBackendPubKey64(),
      JSON.stringify(data),
    );

    return encription;
  } catch (err) {
    console.log("backend fetch wrapper error", err);
    return false;
  }
}

async function decodeRequest(privateKey, data) {
  try {
    const message = await decryptMessage(
      privateKey,
      getBackendPubKey64(),
      data,
    );
    try {
      return JSON.parse(message);
    } catch {
      return message;
    }
  } catch (err) {
    console.log("backend fetch wrapper error", err);
    return false;
  }
}
