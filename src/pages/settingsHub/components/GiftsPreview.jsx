import "./GiftsPreview.css";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { useGifts } from "../../../contexts/giftContext";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import WidgetCard from "./WidgetCard";
import GiftCardItem from "./stubs/GiftCardItem";

export default function GiftsPreview({ onPress }) {
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
  const { giftsArray } = useGifts();

  const shownGifts = (giftsArray || []).slice(0, 2);
  const hasMoreGifts = (giftsArray || []).length > 2;
  const numberOfMoreGifts = (giftsArray || []).length - 2;

  const iconBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundColor
        : backgroundOffset
      : Colors.primary || "#0375F6";

  if (!(giftsArray || []).length) {
    return (
      <WidgetCard onPress={onPress}>
        <div className="gifts-preview__row">
          <div className="gifts-preview__left">
            <span className="gifts-preview__title" style={{ color: textColor }}>
              {t("screens.inAccount.giftPages.giftsHome.title")}
            </span>
            <span className="gifts-preview__desc" style={{ color: textColor }}>
              {t("screens.inAccount.giftPages.giftsHome.desc")}
            </span>
          </div>
          <div
            className="gifts-preview__icon-wrap"
            style={{ backgroundColor: iconBg }}
          >
            <Gift size={22} color="#fff" />
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard onPress={onPress}>
      <div className="gifts-preview__header">
        <span className="gifts-preview__title" style={{ color: textColor }}>
          {t("screens.inAccount.giftPages.giftsHome.title")}
        </span>
        <span className="gifts-preview__view-all" style={{ color: textColor }}>
          {t("settings.hub.viewAll")}
        </span>
      </div>

      {shownGifts.map((gift, index, arr) => (
        <GiftCardItem
          key={gift.uuid || `gift-${index}`}
          item={gift}
          showDivider={index < arr.length - 1}
        />
      ))}

      {hasMoreGifts && (
        <span className="gifts-preview__more" style={{ color: textColor }}>
          {t("settings.hub.morePoolsCount", { count: numberOfMoreGifts })}
        </span>
      )}
    </WidgetCard>
  );
}
