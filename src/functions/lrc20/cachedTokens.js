import sha256Hash from "../hash";
import Storage from "../localStorage";
const TOKEN_CACHE_KEY = "spark_wallet_tokens_cache";

export const getCachedTokens = async () => {
  try {
    const cached = Storage.getItem(TOKEN_CACHE_KEY);
    return cached || {};
  } catch (err) {
    console.warn("Error reading token cache:", err);
    return {};
  }
};

export const saveCachedTokens = async (tokens) => {
  try {
    Storage.setItem(TOKEN_CACHE_KEY, tokens);
  } catch (err) {
    console.warn("Error saving token cache:", err);
  }
};

export const migrateCachedTokens = async (mnemonic) => {
  const mnemonicHash = sha256Hash(mnemonic);
  let parsedData = await getCachedTokens();

  const isOldFormat =
    !parsedData[mnemonicHash] &&
    Object.keys(parsedData).some((key) => key.startsWith("btkn"));

  if (isOldFormat) {
    console.log("Migrating old token cache format to mnemonic-hash format");

    const migratedTokens = {};
    for (const [key, value] of Object.entries(parsedData)) {
      if (key.startsWith("btkn")) {
        migratedTokens[key] = value;
        delete parsedData[key];
      }
    }

    parsedData[mnemonicHash] = migratedTokens;

    Storage.setItem(TOKEN_CACHE_KEY, parsedData);
  }

  return parsedData;
};

export const mergeTokensWithCache = (currentTokens, cachedTokens, mnemonic) => {
  let merged = {};
  const selctedCashedTokens = cachedTokens[sha256Hash(mnemonic)]
    ? cachedTokens[sha256Hash(mnemonic)]
    : {};

  // Update with current token data
  for (const [identifier, tokenData] of Object.entries(selctedCashedTokens)) {
    merged[identifier] = {
      ...tokenData,
      balance: 0,
    };
  }

  for (const [identifier, tokensData] of currentTokens) {
    merged[identifier] = {
      balance: Number(tokensData.balance),
      tokenMetadata: {
        ...tokensData.tokenMetadata,
        maxSupply: Number(tokensData.tokenMetadata.maxSupply),
      },
    };
  }
  console.log(merged);

  return { ...cachedTokens, [sha256Hash(mnemonic)]: merged };
};
