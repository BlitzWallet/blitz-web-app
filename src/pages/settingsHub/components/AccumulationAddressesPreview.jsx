import "./AccumulationAddressesPreview.css";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine } from "lucide-react";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import WidgetCard from "./WidgetCard";

export default function AccumulationAddressesPreview({ onPress }) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
  const { t } = useTranslation();

  const iconBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundColor
        : backgroundOffset
      : Colors.primary || "#0375F6";

  return (
    <WidgetCard onPress={onPress}>
      <div className="accumulation-preview__row">
        <div className="accumulation-preview__left">
          <span
            className="accumulation-preview__title"
            style={{ color: textColor }}
          >
            {t("screens.accumulationAddresses.title")}
          </span>
          <span
            className="accumulation-preview__desc"
            style={{ color: textColor }}
          >
            {t("screens.accumulationAddresses.subtitle")}
          </span>
        </div>
        <div
          className="accumulation-preview__icon-wrap"
          style={{ backgroundColor: iconBg }}
        >
          <ArrowDownToLine size={22} color="#fff" />
        </div>
      </div>
    </WidgetCard>
  );
}
