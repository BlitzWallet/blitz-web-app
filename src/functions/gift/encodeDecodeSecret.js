import { Buffer } from "buffer";

/**
 * Creates shareable gift URLs from a gift ID and a random 32-byte secret.
 * The secret is base64url-encoded into the URL fragment.
 */
export function createGiftUrl(giftId, randomSecret) {
  let secretBytes;
  if (randomSecret instanceof Uint8Array) {
    secretBytes = Buffer.from(randomSecret);
  } else if (typeof randomSecret === "string") {
    secretBytes = Buffer.from(randomSecret, "hex");
  } else {
    secretBytes = randomSecret;
  }

  const secretBase64 = secretBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return {
    webUrl: `https://blitzwalletapp.com/gift/${giftId}#${secretBase64}`,
    appUrl: `blitzwallet://gift/${giftId}/${secretBase64}`,
    qrData: `blitzwallet://gift/${giftId}/${secretBase64}`,
  };
}

/**
 * Parses a gift URL (web or deep-link) and returns { giftId, secret }.
 * Returns null if the URL does not match any known format.
 */
export function parseGiftUrl(url) {
  // Web URL format: https://blitzwalletapp.com/gift/{uuid}#{base64url-secret}
  let match = url.match(/\/gift\/([^#/]+)#(.+)/);
  if (match) {
    const [, giftId, secretBase64] = match;
    const secret = decodeBase64UrlToHex(secretBase64);
    return { giftId, secret };
  }

  // Deep-link format: blitzwallet://gift/{uuid}/{base64url-secret}
  match = url.match(/blitzwallet:\/\/gift\/([^/]+)\/(.+)/);
  if (match) {
    const [, giftId, secretBase64] = match;
    const secret = decodeBase64UrlToHex(secretBase64);
    return { giftId, secret };
  }

  return null;
}

function decodeBase64UrlToHex(secretBase64) {
  const padded = secretBase64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(
      secretBase64.length + ((4 - (secretBase64.length % 4)) % 4),
      "=",
    );
  return Buffer.from(padded, "base64").toString("hex");
}
