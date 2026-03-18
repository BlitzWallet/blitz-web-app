import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, MessageSquareText, Globe, Clock } from "lucide-react";
import ThemeText from "../../components/themeText/themeText";
import useThemeColors from "../../hooks/useThemeColors";
import { useAppStatus } from "../../contexts/appStatus.jsx";
import { useGlobalAppData } from "../../contexts/appDataContext.jsx";
import { useToast } from "../../contexts/toastManager.jsx";
import { useThemeContext } from "../../contexts/themeContext";
import { Colors } from "../../constants/theme";
import "./style.css";
import NavBarProfileImage from "../../components/navBar/profileImage.jsx";

const APPLIST = [
  {
    nameKey: "apps.appList.AI",
    descriptionKey: "apps.appList.AIDescription",
    pageName: "chatgpt",
    Icon: Bot,
  },
  // {
  //   nameKey: "apps.appList.SMS",
  //   descriptionKey: "apps.appList.SMSDescription",
  //   pageName: "sms4sats",
  //   Icon: MessageSquareText,
  // },
  {
    nameKey: "apps.appList.onlineListings",
    descriptionKey: "apps.appList.onlineListingsDescription",
    pageName: "onlinelistings",
    Icon: Globe,
  },
  {
    nameKey: "apps.appList.Soon",
    descriptionKey: "apps.appList.SoonDescription",
    pageName: "soon",
    Icon: Clock,
  },
];

export default function Store() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const { isConnectedToTheInternet } = useAppStatus();
  const { decodedChatGPT, decodedGiftCards } = useGlobalAppData();
  const { showToast } = useToast();
  const { theme, darkModeType } = useThemeContext();

  const internetRequiredApps = ["chatgpt", "sms4sats", "onlinelistings"];

  function handleAppPress(pageName) {
    if (!isConnectedToTheInternet && internetRequiredApps.includes(pageName)) {
      showToast({
        type: "error",
        title: "errormessages.internetReconnection",
      });
      return;
    }

    if (pageName === "soon") {
      showToast({
        type: "info",
        title: "screens.inAccount.appStore.soonMessage",
      });
      return;
    }

    navigate("/store-item", { state: { for: pageName } });
  }

  function handleGiftCardPress() {
    if (!isConnectedToTheInternet) {
      showToast({
        type: "error",
        title: "errormessages.internetReconnection",
      });
      return;
    }

    if (!decodedGiftCards?.profile?.email) {
      navigate("/store-item", { state: { for: "giftcards-create-account" } });
    } else {
      navigate("/store-item", { state: { for: "giftcards" } });
    }
  }

  const iconBgColor = theme
    ? darkModeType
      ? Colors.dark.text
      : Colors.dark.background
    : Colors.dark.text;

  const iconColor =
    theme && !darkModeType ? Colors.dark.text : Colors.light.text;

  const giftCardBannerBg = theme
    ? darkModeType
      ? Colors.lightsout.backgroundOffset
      : Colors.dark.backgroundOffset
    : Colors.dark.text;

  const giftCardLayer1 = theme
    ? darkModeType
      ? Colors.lightsout.backgroundOffset
      : Colors.dark.backgroundOffset
    : Colors.light.giftCardBlue;

  const giftCardLayer2 = theme
    ? darkModeType
      ? Colors.lightsout.giftCardBlue2
      : Colors.dark.giftCardBlue2
    : Colors.light.giftCardBlue2;

  const giftCardLayer3 = theme
    ? darkModeType
      ? Colors.lightsout.giftCardBlue3
      : Colors.dark.giftCardBlue3
    : Colors.light.giftCardBlue3;

  return (
    <div className="storeContainer" style={{ backgroundColor }}>
      <div className="storeTopBar">
        <ThemeText
          textContent={t("screens.inAccount.appStore.title")}
          className="storeHeaderText"
        />
        <div>
          <NavBarProfileImage />
        </div>
      </div>

      <div className="storeScrollContent">
        {/* Gift Cards Banner */}
        <div
          className="giftCardBanner"
          style={{ backgroundColor: giftCardBannerBg }}
          onClick={handleGiftCardPress}
        >
          <div
            className="giftCardBgLayer"
            style={{ width: "95%", backgroundColor: giftCardLayer3 }}
          />
          <div
            className="giftCardBgLayer"
            style={{ width: "87%", backgroundColor: giftCardLayer2 }}
          />
          <div
            className="giftCardBgLayer"
            style={{ width: "80%", backgroundColor: giftCardLayer1 }}
          />
          <ThemeText
            textStyles={{ color: Colors.dark.text }}
            className={"giftCardBannerText"}
            textContent={t("screens.inAccount.appStore.shopTitle")}
          />
          <ThemeText
            textStyles={{ color: Colors.dark.text }}
            className={"giftCardBannerDescription"}
            textContent={t("screens.inAccount.appStore.shopDescription")}
          />
        </div>

        {/* App Grid */}
        <div className="appGrid">
          {APPLIST.map((app) => (
            <button
              key={app.pageName}
              className="appGridItem"
              style={{ backgroundColor: backgroundOffset }}
              onClick={() => handleAppPress(app.pageName)}
            >
              <div className="appGridItemHeader">
                <div
                  className="appGridItemIcon"
                  style={{ backgroundColor: iconBgColor }}
                >
                  <app.Icon size={22} color={iconColor} />
                </div>
                <ThemeText
                  textContent={t(app.nameKey)}
                  className="appGridItemTitle"
                />
              </div>
              <ThemeText
                textContent={t(app.descriptionKey)}
                className="appGridItemDescription"
              />
            </button>
          ))}
        </div>

        {/* Call to Action */}
        <div className="storeCallToAction">
          <ThemeText
            textContent={t("screens.inAccount.appStore.callToAction")}
            className="storeCallToActionText"
          />
          <button
            className="storeContactButton"
            onClick={() => {
              window.open(
                "mailto:blake@blitzwalletapp.com?subject=App%20store%20integration%20request",
                "_blank",
              );
            }}
          >
            {t("constants.contactUs")}
          </button>
        </div>
      </div>
    </div>
  );
}
