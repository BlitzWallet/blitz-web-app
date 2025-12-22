import React, { useState } from "react";
import "./showProfileQr.css";
import QRCodeQrapper from "../../../../components/qrCode/qrCode";
import { useThemeContext } from "../../../../contexts/themeContext";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import ContactProfileImage from "../../../contacts/components/profileImage/profileImage";
import CustomSettingsNavBar from "../../../../components/customSettingsNavbar";
import { useTranslation } from "react-i18next";
import { Copy, ScanLine, Upload } from "lucide-react";
import ThemeText from "../../../../components/themeText/themeText";
import { Colors } from "../../../../constants/theme";

export default function ShowProfileQr() {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState("blitz");
  const [copied, setCopied] = useState(false);
  const { theme, darkModeType } = useThemeContext();
  const { globalContactsInformation } = useGlobalContacts();
  const { cache } = useImageCache();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();

  const name = globalContactsInformation?.myProfile?.name;
  const uniqueName = globalContactsInformation?.myProfile?.uniqueName;
  const lnurl = `${uniqueName}@blitzwalletapp.com`;
  const deeplink = `https://blitzwalletapp.com/u/${uniqueName}`;
  const currentValue = activeType === "lnurl" ? lnurl : deeplink;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      text:
        activeType === "lnurl"
          ? currentValue
          : `Connect with me on Blitz!\n${currentValue}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    } else {
      handleCopy();
    }
  };
  const activeToggleColor = theme ? backgroundColor : Colors.dark.text;

  const handleScanProfile = () => {
    alert("Camera scanning would be implemented here");
  };

  return (
    <div className={`profile-qr-container ${theme}`}>
      <CustomSettingsNavBar
        text={t("settings.index.showQR")}
        showLeftImage={true}
        LeftImageIcon={Upload}
        leftImageFunction={handleShare}
      />

      <div className="content-wrapper">
        {/* Profile Section */}
        <div className="profile-section">
          <div
            style={{ backgroundColor: backgroundOffset }}
            className="profile-image"
          >
            <ContactProfileImage
              updated={
                cache[globalContactsInformation?.myProfile?.uuid]?.updated
              }
              uri={cache[globalContactsInformation?.myProfile?.uuid]?.localUri}
              theme={theme}
              darkModeType={darkModeType}
            />
          </div>
          <ThemeText
            className="profile-name"
            textContent={name || "Anonymous"}
          />
          <ThemeText
            className="profile-username"
            textContent={`@${uniqueName}`}
          />
        </div>

        {/* Toggle Section */}
        <div
          style={{ backgroundColor: backgroundOffset }}
          className="toggle-container"
        >
          <button
            style={{
              backgroundColor:
                activeType === "lnurl" ? activeToggleColor : "transparent",
              color: textColor,
            }}
            className={`toggle-btn ${activeType === "lnurl" ? "active" : ""}`}
            onClick={() => setActiveType("lnurl")}
          >
            LN Address
          </button>
          <button
            style={{
              backgroundColor:
                activeType === "blitz" ? activeToggleColor : "transparent",
              color: textColor,
            }}
            className={`toggle-btn ${activeType === "blitz" ? "active" : ""}`}
            onClick={() => setActiveType("blitz")}
          >
            Blitz Contact
          </button>
        </div>

        {/* QR Code Section */}
        <div className="qr-wrapper">
          <div className="qr-card" onClick={handleCopy}>
            <QRCodeQrapper data={currentValue} />
          </div>

          <div
            style={{
              backgroundColor:
                theme && darkModeType
                  ? backgroundOffset
                  : Colors.constants.blue,
            }}
            className="action-btn primary-btn"
            onClick={handleCopy}
          >
            <Copy />
            <span className="btn-text">
              {copied
                ? "Copied!"
                : activeType === "lnurl"
                ? "Copy LN Address"
                : "Copy Blitz Contact"}
            </span>
          </div>

          {/* <div className="action-btn secondary-btn" onClick={handleScanProfile}>
            <ScanLine />
            <ThemeText
              textStyles={{ margin: 0 }}
              textContent={"Scan Profile"}
            />
          </div> */}
        </div>
      </div>
    </div>
  );
}
