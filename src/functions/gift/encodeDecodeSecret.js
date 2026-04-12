function createGiftUrl(giftId, randomSecret) {
  // Uint8Array/Buffers do not support .toString("base64"); that yields "1,2,3..." for TypedArrays.
  const secretBase64 = Buffer.from(randomSecret)
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

function parseGiftUrl(url) {
  let match = url.match(/\/gift\/([^#]+)#(.+)/);
  if (match) {
    const [, giftId, secretFragment] = match;
    const trimmed = secretFragment.trim();

    // Legacy bug: fragment was comma-separated byte decimals instead of base64url.
    if (/^\d+(,\d+)*$/.test(trimmed)) {
      const bytes = trimmed.split(",").map((s) => Number(s));
      if (bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) {
        const secret = Buffer.from(bytes).toString("hex");
        return { giftId, secret };
      }
    }

    const paddedSecret = trimmed
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(trimmed.length + ((4 - (trimmed.length % 4)) % 4), "=");

    const secret = Buffer.from(paddedSecret, "base64").toString("hex");
    return { giftId, secret };
  }

  match = url.match(/blitzwallet:\/\/gift\/([^\/]+)\/(.+)/);
  if (match) {
    const [, giftId, secretBase64] = match;
    const paddedSecret = secretBase64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(secretBase64.length + ((4 - (secretBase64.length % 4)) % 4), "=");

    const secret = Buffer.from(paddedSecret, "base64").toString("hex");
    return { giftId, secret };
  }

  return null;
}

export { createGiftUrl, parseGiftUrl };
