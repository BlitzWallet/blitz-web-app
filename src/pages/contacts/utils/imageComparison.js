import sha256Hash from "../../../functions/hash";

/**
 * Convert blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob) {
  return await blob.arrayBuffer();
}

/**
 * Convert data URL to ArrayBuffer
 */
async function dataURLToArrayBuffer(dataURL) {
  const base64 = dataURL.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get MD5 hash of image from various sources
 * @param {string|Blob} imageSource - Can be a data URL, object URL, or Blob
 * @returns {Promise<string>} MD5 hash as hex string
 */
export async function getImageHash(imageSource) {
  if (!imageSource) return "";

  try {
    let arrayBuffer;

    if (imageSource instanceof Blob) {
      // Handle Blob directly
      arrayBuffer = await blobToArrayBuffer(imageSource);
    } else if (typeof imageSource === "string") {
      if (imageSource.startsWith("data:")) {
        // Handle data URL
        arrayBuffer = await dataURLToArrayBuffer(imageSource);
      } else if (imageSource.startsWith("blob:")) {
        // Handle object URL
        const response = await fetch(imageSource);
        const blob = await response.blob();
        arrayBuffer = await blobToArrayBuffer(blob);
      } else {
        // Handle regular URL
        const response = await fetch(imageSource);
        const blob = await response.blob();
        arrayBuffer = await blobToArrayBuffer(blob);
      }
    } else {
      throw new Error("Invalid image source type");
    }

    // Use SubtleCrypto to compute MD5-equivalent hash
    // Note: MD5 is not available in Web Crypto API, so we use SHA-256
    // and take first 32 chars to simulate MD5 length

    const hashBuffer = sha256Hash(arrayBuffer);
    // await crypto.subtle.digest('SHA-256', arrayBuffer);
    // const fullHash = arrayBufferToHex(hashBuffer);

    // Return first 32 characters to match MD5 length (128 bits)
    return hashBuffer;
  } catch (e) {
    console.error("Error getting image hash:", e);
    return "";
  }
}

/**
 * Compare two images to see if they're identical
 * @param {string|Blob} source1 - First image (data URL, object URL, or Blob)
 * @param {string|Blob} source2 - Second image (data URL, object URL, or Blob)
 * @returns {Promise<boolean>} True if images are identical
 */
export async function areImagesSame(source1, source2) {
  try {
    const hash1 = await getImageHash(source1);
    const hash2 = await getImageHash(source2);
    console.log(source1, source2);
    if (!hash1 || !hash2) {
      return false;
    }

    return hash1 === hash2;
  } catch (e) {
    console.error("Error comparing images:", e);
    return false;
  }
}
