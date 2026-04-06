import "./PointOfSaleBanner.css";
import { useTranslation } from "react-i18next";
import { Calculator } from "lucide-react";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import WidgetCard from "./WidgetCard";

export default function PointOfSaleBanner({ onPress }) {
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
      <div className="pos-banner__row">
        <div className="pos-banner__left">
          <span className="pos-banner__title" style={{ color: textColor }}>
            {t("settings.posPath.settings.title")}
          </span>
          <span className="pos-banner__desc" style={{ color: textColor }}>
            {t("settings.hub.pos.desc")}
          </span>
        </div>
        <div
          className="pos-banner__icon-wrap"
          style={{ backgroundColor: iconBg }}
        >
          <Calculator size={22} color="#fff" />
        </div>
      </div>
    </WidgetCard>
  );
}
