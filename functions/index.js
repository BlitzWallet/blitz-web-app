// functions/index.js (Refactored for Firebase Functions v2)
require("dotenv").config(); // Only once at the very top of the file

// Use V2 imports for functions
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin"); // Import admin SDK

// Import your crypto helper functions
const {
  decryptWithSharedKey,
  encryptWithSharedKey,
} = require("./cryptoHelpers");

// Initialize Firebase Admin SDK (only once)
admin.initializeApp({
  serviceAccountId: "blitzwallet-699af@appspot.gserviceaccount.com",
});

// Set global options for all functions in this file (optional, but good practice for v2)
// For example, to limit the number of concurrent instances
setGlobalOptions({ maxInstances: 10 });

function getBackendPrivateKey() {
  const fromEnv = (process.env.BACKEND_PRIVATE_KEY || "").replace(/^0x/i, "");
  const fromConfig = (
    require("firebase-functions").config().backend?.private_key || ""
  ).replace(/^0x/i, "");
  const raw = fromEnv || fromConfig;
  if (!raw || raw.length < 64) {
    throw new Error(
      "BACKEND_PRIVATE_KEY is not configured or invalid (too short). Set it in functions/.env for emulator, or use firebase functions:config:set for deployed.",
    );
  }
  return raw.slice(0, 64);
}

async function decryptMessageBackend(
  backendPrivateKey,
  clientPublicKey,
  encryptedMessage,
) {
  const plaintext = await decryptWithSharedKey(
    backendPrivateKey,
    clientPublicKey,
    encryptedMessage,
  );
  return JSON.parse(plaintext);
}

// Declare the customToken Cloud Function using v2 callable function syntax
exports.customToken = onCall(async (request) => {
  try {
    return await handleCustomToken(request);
  } catch (err) {
    // Re-throw HttpsErrors as-is so client gets correct code
    if (err instanceof HttpsError) throw err;
    // Log real error for debugging (e.g. BACKEND_PRIVATE_KEY not set)
    console.error("customToken unexpected error:", err);
    throw new HttpsError(
      "internal",
      err.message && err.message.includes("BACKEND_PRIVATE_KEY")
        ? "Backend key not configured. Set backend.private_key in Firebase config or BACKEND_PRIVATE_KEY env."
        : "An unexpected error occurred.",
    );
  }
});

async function handleCustomToken(request) {
  // In V2 callable functions, 'context' is now part of the 'request' object's 'auth' property.
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "The request must be authenticated with an anonymous user.",
    );
  }

  const anonymousUid = auth.uid;
  const encryptedMessage = data?.em;
  const clientPublicKey = data?.publicKey;

  if (!encryptedMessage || !clientPublicKey) {
    throw new HttpsError(
      "invalid-argument",
      "Missing encrypted message (em) or client public key.",
    );
  }

  const backendPrivateKey = getBackendPrivateKey();

  let decrypted;
  try {
    decrypted = await decryptMessageBackend(
      backendPrivateKey,
      clientPublicKey,
      encryptedMessage,
    );
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new HttpsError(
      "invalid-argument",
      "Message decryption failed. Possible invalid keys or tampering.",
    );
  }

  const userAuthFromDecryption = decrypted?.userAuth;
  if (!userAuthFromDecryption || userAuthFromDecryption !== anonymousUid) {
    throw new HttpsError(
      "permission-denied",
      "Decrypted user ID does not match authenticated anonymous user.",
    );
  }

  let customToken;
  try {
    // The UID for Firebase Authentication. As per your requirement, use clientPublicKey.
    const firebaseUidForCustomToken = clientPublicKey;
    customToken = await admin
      .auth()
      .createCustomToken(firebaseUidForCustomToken);
  } catch (error) {
    console.error("Error creating custom token:", error);
    throw new HttpsError(
      "internal",
      "Failed to generate custom authentication token.",
    );
  }

  try {
    // Encrypt the custom token before returning it to the client
    // customToken is already a string, so JSON.stringify might not be necessary
    // unless you expect it to be an object in other contexts.
    const encryptedToken = await encryptWithSharedKey(
      backendPrivateKey,
      clientPublicKey,
      customToken, // Assuming customToken is already a string
    );
    return { token: encryptedToken };
  } catch (error) {
    console.error("Error encrypting custom token:", error);
    throw new HttpsError(
      "internal",
      "Failed to encrypt custom authentication token.",
    );
  }
}

// Returns the current server timestamp, encrypted with the shared key
exports.serverTime = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const clientPublicKey = data?.publicKey;
  if (!clientPublicKey) {
    throw new HttpsError("invalid-argument", "Missing client public key.");
  }

  const backendPrivateKey = getBackendPrivateKey();
  const timestamp = Date.now();

  try {
    const encrypted = await encryptWithSharedKey(
      backendPrivateKey,
      clientPublicKey,
      JSON.stringify({ timestamp }),
    );
    return encrypted;
  } catch (error) {
    console.error("Error in serverTime:", error);
    throw new HttpsError("internal", "Failed to generate server time.");
  }
});

// Returns Bitcoin price data for a given fiat currency
exports.bitcoinPriceData = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const clientPublicKey = data?.publicKey;
  if (!clientPublicKey) {
    throw new HttpsError("invalid-argument", "Missing client public key.");
  }

  const backendPrivateKey = getBackendPrivateKey();

  let decrypted;
  try {
    decrypted = await decryptMessageBackend(
      backendPrivateKey,
      clientPublicKey,
      data.em,
    );
  } catch (error) {
    console.error("bitcoinPriceData decryption failed:", error);
    throw new HttpsError("invalid-argument", "Decryption failed.");
  }

  const currencyCode = (decrypted?.currencyCode || "USD").toUpperCase();

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currencyCode}&include_24hr_change=true`,
    );
    const json = await res.json();
    const btcData = json.bitcoin || {};
    const responsePayload = {
      price: btcData[currencyCode.toLowerCase()] || 0,
      change24h: btcData[`${currencyCode.toLowerCase()}_24h_change`] || 0,
      currencyCode,
    };

    const encrypted = await encryptWithSharedKey(
      backendPrivateKey,
      clientPublicKey,
      JSON.stringify(responsePayload),
    );
    return encrypted;
  } catch (error) {
    console.error("Error in bitcoinPriceData:", error);
    throw new HttpsError("internal", "Failed to fetch Bitcoin price.");
  }
});
