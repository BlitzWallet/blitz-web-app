import { useCallback, useState } from "react";
import "./ProfileCard.css";
import { useTranslation } from "react-i18next";
import useThemeColors from "../../../hooks/useThemeColors";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import ContactProfileImage from "../../contacts/components/profileImage/profileImage";

export default function ProfileCard({
  profileImage,
  name,
  uniqueName,
  onEditPress,
  onShowQRPress,
  onCopyUsername,
}) {
  const { backgroundOffset, textColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  const { t } = useTranslation();

  const buttonBg = theme
    ? backgroundOffset
    : Colors.dark.text;
  const buttonTextColor = theme ? Colors.dark.text : Colors.light.text;

  return (
    <div className="profile-card">
      <div
        className="profile-card__avatar"
        style={{ backgroundColor: backgroundOffset }}
      >
        <ContactProfileImage
          updated={profileImage?.updated}
          uri={profileImage?.localUri}
          darkModeType={darkModeType}
          theme={theme}
        />
      </div>

      <div className="profile-card__info">
        <span
          className="profile-card__name"
          style={{ color: textColor, opacity: name ? 0.5 : 0.8 }}
        >
          {name || t("constants.annonName")}
        </span>
        <button
          className="profile-card__username"
          style={{ color: textColor }}
          onClick={onCopyUsername}
        >
          @{uniqueName}
        </button>
      </div>

      <div className="profile-card__actions">
        <button
          className="profile-card__action-btn"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
          onClick={onEditPress}
        >
          {t("settings.index.editProfile")}
        </button>
        <button
          className="profile-card__action-btn"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
          onClick={onShowQRPress}
        >
          {t("settings.index.showQR")}
        </button>
      </div>
    </div>
  );
}
