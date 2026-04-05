import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { bech32m } from "bech32";

/**
 * Must match @buildonspark/spark-sdk initWallet: REGTEST → 0, MAINNET → 1.
 * Use for deriveSparkIdentityKey and SparkWallet.initialize so the address
 * you fund is the same wallet SparkWallet loads.
 */
export function getSparkDefaultAccountNumber() {
  return import.meta.env.MODE === "development" ? 0 : 1;
}

/**
 * Derives a mnemonic for a Spark Wallet gift at a specific index.
 * Path: m/8797555'/{giftIndex}'/0'
 */
export function deriveSparkGiftMnemonic(mnemonic, giftIndex = 0) {
  try {
    const derivationPath = `m/8797555'/${giftIndex}'/0'`;
    const seed = mnemonicToSeedSync(mnemonic);
    const masterKey = HDKey.fromMasterSeed(seed);
    const identityKey = masterKey.derive(derivationPath);

    const entropy128 = identityKey.privateKey.slice(0, 16);
    const derivedMnemonic = entropyToMnemonic(entropy128, wordlist);

    return {
      success: true,
      derivedMnemonic,
      identityPrivateKey: identityKey.privateKey,
      identityPublicKey: identityKey.publicKey,
      derivationPath,
      giftIndex,
    };
  } catch (err) {
    console.log("derive spark gift mnemonic error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Derives the identity key that Spark generates internally for a given mnemonic.
 * Path: m/8797555'/{accountNumber}'/0'. Default account matches Spark SDK (REGTEST: 0, MAINNET: 1).
 */
export function deriveSparkIdentityKey(
  sparkMnemonic,
  accountNumber = getSparkDefaultAccountNumber(),
) {
  try {
    const derivationPath = `m/8797555'/${accountNumber}'/0'`;
    const seed = mnemonicToSeedSync(sparkMnemonic);
    const masterKey = HDKey.fromMasterSeed(seed);
    const identityKey = masterKey.derive(derivationPath);

    return {
      success: true,
      privateKey: identityKey.privateKey,
      publicKey: identityKey.publicKey,
      publicKeyHex: Array.from(identityKey.publicKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      derivationPath,
    };
  } catch (err) {
    console.log("derive spark identity key error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Derives a Spark bech32m address from a 33-byte compressed identity public key.
 */
export function deriveSparkAddress(identityPublicKey) {
  try {
    if (
      !(identityPublicKey instanceof Uint8Array) ||
      identityPublicKey.length !== 33
    ) {
      throw new Error(
        "identityPublicKey must be a 33-byte compressed Uint8Array",
      );
    }

    let hrp;
    if (import.meta.env.MODE === "development") {
      hrp = "sparkrt";
    } else {
      hrp = "spark";
    }
    // const hrp = "spark";
    const pubKeyLength = identityPublicKey.length;

    const dataPayload = new Uint8Array(2 + pubKeyLength);
    dataPayload[0] = 0x0a; // Protobuf tag: field 1, wire type 2
    dataPayload[1] = pubKeyLength;
    dataPayload.set(identityPublicKey, 2);

    const words = bech32m.toWords(dataPayload);
    const address = bech32m.encode(hrp, words);

    return { success: true, address };
  } catch (err) {
    console.log("derive spark address error:", err);
    return { success: false, error: err.message };
  }
}
