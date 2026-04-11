import "./SavingsPreview.css";
import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";
import { useSavings } from "../../../contexts/savingsContext";
import { useGlobalContextProvider } from "../../../contexts/masterInfoObject";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import WidgetCard from "./WidgetCard";

export default function SavingsPreview({ onPress }) {
  const { t } = useTranslation();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
  const { savingsBalance } = useSavings();
  const { masterInfoObject } = useGlobalContextProvider();
  const { theme, darkModeType } = useThemeContext();

  const iconBg =
    theme && darkModeType ? backgroundColor : Colors.dollarGreen || "#2DB87E";

  const isHidden = masterInfoObject?.userBalanceDenomination === "hidden";

  return (
    <WidgetCard onPress={onPress}>
      <div className="savings-preview__row">
        <div className="savings-preview__left">
          <span
            className="savings-preview__title"
            style={{ color: textColor }}
          >
            {t("savings.preview.title")}
          </span>
          {isHidden ? (
            <span
              className="savings-preview__balance--hidden"
              style={{ color: textColor }}
            >
              ● ● ● ● ●
            </span>
          ) : (
            <span
              className="savings-preview__balance"
              style={{ color: textColor }}
            >
              {(savingsBalance || 0).toLocaleString()} sats
            </span>
          )}
          <span
            className="savings-preview__rate"
            style={{ color: textColor }}
          >
            {t("savings.preview.earnInterest")}
          </span>
        </div>
        <div
          className="savings-preview__icon-wrap"
          style={{ backgroundColor: iconBg }}
        >
          <DollarSign size={20} color="#fff" />
        </div>
      </div>
    </WidgetCard>
  );
}
