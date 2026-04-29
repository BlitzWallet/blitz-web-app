import { useTranslation } from "react-i18next";
import ThemeIcon from "../../../components/themeIcon";
import ThemeText from "../../../components/themeText/themeText";
import "./swapRatesChangedState.css";

function fallbackText(value, fallback) {
  return !value || value === fallback ? fallback : value;
}

export default function SwapRatesChangedState() {
  const { t } = useTranslation();

  const title = fallbackText(
    t("wallet.sendPages.sendPaymentScreen.swapRatesChangedTitle"),
    "Swap rate changed",
  );
  const body = fallbackText(
    t("wallet.sendPages.sendPaymentScreen.swapRatesChangedBody"),
    "Refresh the quote or go back and try again with the latest rate.",
  );

  return (
    <div className="swap-rates-state">
      <ThemeIcon iconName="RefreshCw" size={36} />
      <ThemeText className="swap-rates-state-title" textContent={title} />
      <ThemeText className="swap-rates-state-body" textContent={body} />
    </div>
  );
}
