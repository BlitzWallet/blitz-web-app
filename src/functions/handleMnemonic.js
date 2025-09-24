import * as CryptoES from "crypto-es";

export function decryptMnemonic(cipherText, pin) {
  try {
    const bytes = CryptoES.default.AES.decrypt(cipherText, pin);
    return bytes.toString(CryptoES.default.enc.Utf8);
  } catch (err) {
    console.log("error decrypting mnemoinc", err);
    return false;
  }
}

export function encryptMnemonic(mnemonic, pin) {
  try {
    return CryptoES.default.AES.encrypt(mnemonic, pin).toString();
  } catch (err) {
    console.log("error encripting mnemonic", err);
  }
}
