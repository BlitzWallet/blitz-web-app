import { SPARK_CACHED_BALANCE_KEY } from "../../constants";
import Storage from "../localStorage";

export async function getCachedSparkBalance() {
  const balance = Storage.getItem(SPARK_CACHED_BALANCE_KEY);
  return balance || 0;
}
