import { BITCOIN_SATS_ICON } from "../../constants";
import i18n from "i18next";

export async function handleGiftCardShare({ amount, giftLink }) {
  const message = i18n.t("screens.inAccount.giftPages.shareMessage", {
    icon: BITCOIN_SATS_ICON,
    amount,
    link: giftLink,
  });

  // Web Share API (mobile browsers + some desktop)
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ text: message });
    return;
  }

  // Clipboard fallback
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(message);
    // Optionally notify user it was copied
    return;
  }

  // Last resort
  console.warn("Sharing not supported in this environment");
}
