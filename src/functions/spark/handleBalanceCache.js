import { SPARK_CACHED_BALANCE_KEY } from "../../constants";
import sha256Hash from "../hash";
import Storage from "../localStorage";

export default async function handleBalanceCache({
  isCheck,
  passedBalance,
  mnemonic,
  returnBalanceOnly = false,
}) {
  const mnemonicHash = sha256Hash(mnemonic);
  console.log(mnemonicHash);

  const cachedBalances = await migrateCachedData(mnemonicHash);
  console.log(cachedBalances);

  if (returnBalanceOnly) {
    return cachedBalances[mnemonicHash] || 0;
  }

  if (isCheck) {
    const cachedBalance = cachedBalances[mnemonicHash] || null;

    if (!cachedBalance) {
      cachedBalances[mnemonicHash] = passedBalance;
      Storage.setItem(SPARK_CACHED_BALANCE_KEY, cachedBalances);
      return { didWork: true, balance: passedBalance };
    }
    if (passedBalance * 1.1 >= cachedBalance) {
      cachedBalances[mnemonicHash] = passedBalance;
      Storage.setItem(SPARK_CACHED_BALANCE_KEY, cachedBalances);
      return { didWork: true, balance: passedBalance };
    } else {
      return { didWork: false, balance: cachedBalance };
    }
  } else {
    // Set the balance for this mnemonic hash
    cachedBalances[mnemonicHash] = passedBalance;
    Storage.setItem(SPARK_CACHED_BALANCE_KEY, cachedBalances);
  }
}

async function migrateCachedData(mnemonicHash) {
  const rawCachedData = Storage.getItem(SPARK_CACHED_BALANCE_KEY);
  if (!rawCachedData) {
    return {};
  }

  const parsedData = rawCachedData;

  if (typeof parsedData === "number") {
    console.log("Migrating old balance cache format to new hash-based format");

    const newFormat = {
      [mnemonicHash]: parsedData,
    };
    Storage.setItem(SPARK_CACHED_BALANCE_KEY, newFormat);
    return newFormat;
  }

  return parsedData;
}
