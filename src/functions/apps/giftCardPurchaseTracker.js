import i18next from "i18next";
import { SATSPERBITCOIN } from "../../constants";
import { isMoreThanADayOld } from "../rotateAddressDateChecker";
import Storage from "../localStorage";

export default async function giftCardPurchaseAmountTracker({
  sendingAmountSat,
  USDBTCValue,
  testOnly = false,
}) {
  const currentTime = new Date();
  try {
    Storage.getItem;
    const dailyPurchaseAmount = Storage.getItem("dailyPurchaeAmount");

    if (dailyPurchaseAmount) {
      if (isMoreThanADayOld(dailyPurchaseAmount.date)) {
        if (!testOnly) {
          Storage.setItem("dailyPurchaeAmount", {
            date: currentTime,
            amount: sendingAmountSat,
          });
        }
      } else {
        const totalPurchaseAmount = Math.round(
          ((dailyPurchaseAmount.amount + sendingAmountSat) / SATSPERBITCOIN) *
            USDBTCValue.value
        );

        if (totalPurchaseAmount > 9000)
          throw new Error(
            i18next.t(
              "apps.giftCards.expandedGiftCardPage.dailyPurchaseAmountError"
            )
          );

        if (!testOnly) {
          Storage.setItem("dailyPurchaeAmount", {
            date: dailyPurchaseAmount.date,
            amount: dailyPurchaseAmount.amount + sendingAmountSat,
          });
        }
      }
    } else {
      if (!testOnly) {
        Storage.setItem("dailyPurchaeAmount", {
          date: currentTime,
          amount: sendingAmountSat,
        });
      }
    }
    return { shouldBlock: false };
  } catch (err) {
    console.log(err);
    return { shouldBlock: true, reason: err.message };
  }
}
