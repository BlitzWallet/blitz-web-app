import * as secp from "@noble/secp256k1";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { IS_LETTER_REGEX } from "../constants";
import { wordlist } from "@scure/bip39/wordlists/english";

// === Key derivation ===
export function privateKeyFromSeedWords(mnemonic, passphrase) {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  let privateKey = root.derive(`m/44'/1237'/0'/0/0`).privateKey;
  if (!privateKey) throw new Error("could not derive private key");
  return secp.etc.bytesToHex(privateKey);
}

export function getPublicKey(privateKey) {
  const pubkeyBytes = secp.getPublicKey(privateKey, true); // compressed
  return secp.etc.bytesToHex(pubkeyBytes).slice(2);
}

export function handleRestoreFromText(seedString) {
  try {
    let wordArray = [];
    let currentIndex = 0;
    let maxIndex = seedString.length;
    let currentWord = "";
    const wordSet = new Set(wordlist.map((word) => word.toLowerCase()));

    while (currentIndex <= maxIndex) {
      const letter = seedString[currentIndex];
      const isLetter = IS_LETTER_REGEX.test(letter);
      if (!isLetter) {
        currentIndex += 1;
        continue;
      }
      currentWord += letter.toLowerCase();
      const currentTry = currentWord;

      const isWord = wordSet.has(currentTry);
      if (isWord) {
        wordArray.push(currentTry);
        currentWord = "";
      }

      currentIndex += 1;
    }

    return { didWork: true, seed: wordArray };
  } catch (err) {
    console.log("handle restore from text error", err);
    return { didWork: false, error: err.message };
  }
}
