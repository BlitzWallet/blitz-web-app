<<<<<<< HEAD
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftsContext";
import { useOverlay } from "../../contexts/overlayContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import WalletNavBar from "../wallet/components/nav/nav";
import GiftCardItem from "./components/giftCardItem/giftCardItem";
import ThemeText from "../../components/themeText/themeText";
import CustomButton from "../../components/customButton/customButton";
import "./store.css";

export default function Store() {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const { openOverlay } = useOverlay();
  const { masterInfoObject } = useGlobalContextProvider();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;
  const { giftsArray, expiredGiftsArray, checkForRefunds } = useGifts();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  useEffect(() => {
    checkForRefunds();
  }, []);

  const activeGifts = useMemo(() => {
    const now = Date.now();
    return giftsArray.filter((g) => {
      const isTerminal = g.state === "Claimed" || g.state === "Reclaimed";
      const isExpired = !isTerminal && g.expireTime && now >= g.expireTime;
      return !isTerminal && !isExpired;
    });
  }, [giftsArray]);

  const hasAnyGifts = giftsArray.length > 0;
  const hasActiveGifts = activeGifts.length > 0;
  const hasExpiredGifts = expiredGiftsArray.length > 0;

  return (
    <div className="giftsOverviewContainer" style={{ backgroundColor }}>
      <div className="giftsOverview-nav">
        <WalletNavBar
          didEnabledLrc20={didEnabledLrc20}
          openOverlay={openOverlay}
        />
      </div>
      <div className="giftsOverview-list">
        {hasActiveGifts && (
          <div className="giftsOverview-section">
            <ThemeText
              textContent="Active"
              className="giftsOverview-sectionTitle"
              textStyles={{ opacity: 0.8 }}
            />
            {activeGifts.map((gift) => (
              <GiftCardItem key={gift.uuid} item={gift} from="overview" />
            ))}
          </div>
        )}

        <div className="giftsOverview-section">
          <div className="giftsOverview-sectionHeader">
            <ThemeText
              textContent="Expired"
              className="giftsOverview-sectionTitle"
              textStyles={{ opacity: 0.8 }}
            />
            {hasExpiredGifts && (
              <button
                type="button"
                className="giftsOverview-reclaimLink"
                style={{ color: colors.giftCardBlue }}
                onClick={() => navigate("/reclaim-gift")}
              >
                Reclaim All
              </button>
            )}
          </div>

          {hasExpiredGifts ? (
            expiredGiftsArray.map((gift) => (
              <GiftCardItem key={gift.uuid} item={gift} from="overview" />
            ))
          ) : (
            <div
              className="giftsOverview-expiredEmpty"
              style={{
                backgroundColor: backgroundOffset,
                border: theme
                  ? darkModeType
                    ? "1px solid rgba(255, 255, 255, 0.1)"
                    : "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <ThemeText
                textContent="No expired gifts to reclaim"
                className="giftsOverview-expiredEmptyText"
                textStyles={{ opacity: 0.55 }}
              />
              <button
                type="button"
                className="giftsOverview-advancedLink"
                style={{ color: colors.giftCardBlue }}
                onClick={() => navigate("/reclaim-gift")}
              >
                Reclaim Gift
              </button>
            </div>
          )}
        </div>

        {!hasAnyGifts && (
          <div className="giftsOverview-empty">
            <div className="giftsOverview-emptyIcon">🎁</div>
            <ThemeText
              textContent="No gifts yet"
              className="giftsOverview-emptyTitle"
            />
            <ThemeText
              textContent="Create a gift to send Bitcoin to anyone with a simple link."
              className="giftsOverview-emptyDesc"
              textStyles={{ opacity: 0.6 }}
            />
          </div>
        )}
      </div>

      <div className="giftsOverview-actions">
        <CustomButton
          actionFunction={() => navigate("/create-gift")}
          textContent="Create Gift"
        />
        <CustomButton
          actionFunction={() =>
            openOverlay({
              for: "halfModal",
              contentType: "claimGiftHalfModal",
              params: { sliderHeight: "40dvh" },
            })
          }
          textContent="Claim Gift"
          buttonStyles={{ backgroundColor: Colors.constants.blue }}
          textStyles={{ color: "#FFFFFF" }}
        />
=======
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
>>>>>>> upstream/main
      </div>
    </div>
  );
}
