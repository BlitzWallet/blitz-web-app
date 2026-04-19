import { Buffer } from "buffer";
import * as secp from "@noble/secp256k1";

const btoa = (str) => {
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(str);
  }
  return Buffer.from(str, "binary").toString("base64");
};

const atob = (b64) => {
  if (typeof window !== "undefined" && window.atob) {
    return window.atob(b64);
  }
  return Buffer.from(b64, "base64").toString("binary");
};

async function encryptMessage(privkey, pubkey, text) {
  try {
    const sharedPoint = secp.getSharedSecret(privkey, "02" + pubkey);
    const sharedX = sharedPoint.slice(1, 33);

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encoder = new TextEncoder();
    const textBuffer = encoder.encode(text);

    const key = await crypto.subtle.importKey(
      "raw",
      sharedX,
      { name: "AES-CBC" },
      false,
      ["encrypt"],
    );

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: iv },
      key,
      textBuffer,
    );

    const encryptedMessage = Buffer.from(encryptedBuffer).toString("base64");
    const ivBase64 = btoa(String.fromCharCode.apply(null, iv));

    return encryptedMessage + "?iv=" + ivBase64;
  } catch (err) {
    console.log(err, "ENCRIPT ERROR");
    return null;
  }
}

async function decryptMessage(privkey, pubkey, encryptedText) {
  try {
    const sharedPoint = secp.getSharedSecret(privkey, "02" + pubkey);
    const sharedX = sharedPoint.slice(1, 33);

    const ivStr = encryptedText.split("?iv=")[1];
    const iv = new Uint8Array(
      atob(ivStr)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const encryptedData = encryptedText.split("?iv=")[0];

    const encryptedBuffer = Buffer.from(encryptedData, "base64");

    const key = await crypto.subtle.importKey(
      "raw",
      sharedX,
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encryptedBuffer,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.log(err, "DECRYPT ERROR");
    return null;
  }
}

export { encryptMessage, decryptMessage };
