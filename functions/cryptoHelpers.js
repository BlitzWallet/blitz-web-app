const { getSharedSecret } = require("@noble/secp256k1");
const { webcrypto } = require("crypto");

function normalizeHex(hex) {
  return hex.replace(/^0x/i, "").toLowerCase();
}

function ensureCompressedPublicKey(pubkeyHex) {
  const hex = normalizeHex(pubkeyHex);
  if (hex.length === 64) {
    // X-only key, add even prefix like client-side ("02" + pubkey)
    return "02" + hex;
  }
  if (hex.length === 66 && (hex.startsWith("02") || hex.startsWith("03"))) {
    return hex;
  }
  throw new Error("Invalid public key format for secp256k1");
}

async function deriveAesKey(privateKeyHex, publicKeyHex) {
  const priv = normalizeHex(privateKeyHex);
  const pub = ensureCompressedPublicKey(publicKeyHex);

  const sharedPoint = getSharedSecret(priv, pub);
  const sharedX = sharedPoint.slice(1, 33); // drop prefix byte

  return webcrypto.subtle.importKey(
    "raw",
    sharedX,
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function decryptWithSharedKey(
  privateKeyHex,
  publicKeyHex,
  encryptedText,
) {
  const parts = String(encryptedText).split("?iv=");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted format");
  }

  const [encryptedB64, ivB64] = parts;
  const iv = new Uint8Array(Buffer.from(ivB64, "base64"));
  const encryptedBuffer = Buffer.from(encryptedB64, "base64");

  const key = await deriveAesKey(privateKeyHex, publicKeyHex);

  const decrypted = await webcrypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    encryptedBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

async function encryptWithSharedKey(privateKeyHex, publicKeyHex, plaintext) {
  const iv = webcrypto.getRandomValues(new Uint8Array(16));
  const textBuffer = new TextEncoder().encode(plaintext);

  const key = await deriveAesKey(privateKeyHex, publicKeyHex);

  const encryptedBuffer = await webcrypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    textBuffer,
  );

  const encryptedB64 = Buffer.from(encryptedBuffer).toString("base64");
  const ivB64 = Buffer.from(iv).toString("base64");

  return `${encryptedB64}?iv=${ivB64}`;
}

module.exports = {
  decryptWithSharedKey,
  encryptWithSharedKey,
};
