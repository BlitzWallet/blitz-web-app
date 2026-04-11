import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Settings } from "lucide-react";
import "./index.css";

import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useAppStatus } from "../../contexts/appStatus";
import { usePools } from "../../contexts/poolContext";
import { useToast } from "../../contexts/toastManager";
import useThemeColors from "../../hooks/useThemeColors";
import useAccountSwitcher from "../../hooks/useAccountSwitcher";
import copyToClipboard from "../../functions/copyToClipboard";

import ProfileCard from "./components/ProfileCard";
import AccountsPreview from "./components/AccountsPreview";
import PoolsPreview from "./components/PoolsPreview";
import SavingsPreview from "./components/SavingsPreview";
import PointOfSaleBanner from "./components/PointOfSaleBanner";
import GiftsPreview from "./components/GiftsPreview";
import AccumulationAddressesPreview from "./components/AccumulationAddressesPreview";
import SectionCard from "./components/SectionCard";
import SettingsRow from "./components/SettingsRow";
import CustomSettingsNavBar from "../../components/customSettingsNavbar";
import ThemeText from "../../components/themeText/themeText";

const SCROLL_THRESHOLD = 100;

const INITIAL_WIDGET_ORDER = [
  // { id: "accounts", type: "accounts" },
  // { id: "savings", type: "savings" },
  // { id: "pools", type: "pools" },
  // { id: "gifts", type: "gifts" },
  // { id: "accumulation", type: "accumulation" },
  // { id: "point-of-sale", type: "point-of-sale" },
];

const DOOMSDAY_ROWS = [
  {
    name: "Backup wallet",
    displayName: "screens.inAccount.settingsContent.backup wallet",
    iconName: "Lock",
  },
  {
    name: "Delete Wallet",
    displayName: "screens.inAccount.settingsContent.delete wallet",
    iconName: "Trash2",
    isDestructive: true,
  },
];

export default function SettingsHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { masterInfoObject } = useGlobalContextProvider();
  const { globalContactsInformation } = useGlobalContacts();
  const { cache } = useImageCache();
  const { isConnectedToTheInternet } = useAppStatus();
  const { activePoolsArray, poolsArray } = usePools();
  const { backgroundColor, textColor } = useThemeColors();

  const {
    isSwitchingAccount,
    handleAccountPress,
    isUsingNostr,
    selectedAltAccount,
  } = useAccountSwitcher();

  const isDoomsday = location.state?.isDoomsday;
  const myProfileImage = cache[masterInfoObject?.uuid];
  const myContact = globalContactsInformation?.myProfile;
  const pinnedAccountUUIDs = masterInfoObject?.pinnedAccounts || [];

  const scrollRef = useRef(null);
  const [showSettingsLabel, setShowSettingsLabel] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowSettingsLabel(el.scrollTop > SCROLL_THRESHOLD);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleEditProfile = useCallback(() => {
    if (!isConnectedToTheInternet) return;

    navigate("/edit-profile", {
      state: { isDoomsday, pageType: "myProfile", fromSettings: true },
    });
  }, [isConnectedToTheInternet, isDoomsday, navigate]);

  const handleShowQR = useCallback(() => {
    navigate("/profile-qr");
  }, [navigate]);

  const handleCopyUsername = useCallback(() => {
    copyToClipboard(myContact?.uniqueName, showToast);
  }, [myContact?.uniqueName, showToast]);

  const handleAccountEdit = useCallback(
    (account) => {
      // EditAccountPage — stub navigates to settings
      navigate("/settings");
    },
    [navigate],
  );

  const handleSettingsRowPress = useCallback(
    (row) => {
      navigate("/settings-item", { state: { for: row.name, isDoomsday } });
    },
    [navigate, isDoomsday],
  );

  if (isDoomsday) {
    return (
      <div className="settings-hub__container" style={{ backgroundColor }}>
        <CustomSettingsNavBar text={t("settings.index.settingsHead")} />

        <div className="settings-hub__doomsday">
          <SectionCard>
            {DOOMSDAY_ROWS.map((row, index) => (
              <SettingsRow
                key={row.name}
                iconName={row.iconName}
                label={t(row.displayName)}
                onPress={() => handleSettingsRowPress(row)}
                isLast={index === DOOMSDAY_ROWS.length - 1}
                isDestructive={row.isDestructive}
              />
            ))}
          </SectionCard>

          <button
            className="settings-hub__restore-btn"
            onClick={() => window.open("https://recover.blitzwalletapp.com/")}
            style={{ borderColor: "#0375F6", color: "#0375F6" }}
          >
            {t("screens.inAccount.settingsContent.blitzRestore")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-hub__container" style={{ backgroundColor }}>
      {/* Top bar */}
      <CustomSettingsNavBar
        text={t("settings.index.profileHead")}
        leftImageFunction={() => navigate("/settings")}
        showLeftImage={true}
        LeftImageIcon={Settings}
      />

      {/* Scrollable list */}
      <div ref={scrollRef} className="settings-hub__scroll">
        <div className="settings-hub__content">
          <ProfileCard
            profileImage={myProfileImage}
            name={myContact?.name || t("constants.annonName")}
            uniqueName={myContact?.uniqueName}
            onEditPress={handleEditProfile}
            onShowQRPress={handleShowQR}
            onCopyUsername={handleCopyUsername}
          />

          {INITIAL_WIDGET_ORDER.map((item) => {
            switch (item.type) {
              case "accounts":
                return (
                  <AccountsPreview
                    key={item.id}
                    pinnedAccountUUIDs={pinnedAccountUUIDs}
                    isUsingNostr={isUsingNostr}
                    selectedAltAccount={selectedAltAccount}
                    isSwitchingAccount={isSwitchingAccount}
                    onAccountPress={handleAccountPress}
                    onAccountEdit={handleAccountEdit}
                    onViewAll={() => navigate("/settings")}
                  />
                );
              case "pools":
                return (
                  <PoolsPreview
                    key={item.id}
                    activePoolsArray={activePoolsArray}
                    poolsArray={poolsArray}
                    onViewAll={() => navigate("/settings")}
                  />
                );
              case "savings":
                return (
                  <SavingsPreview
                    key={item.id}
                    onPress={() => navigate("/settings")}
                  />
                );
              case "point-of-sale":
                return (
                  <PointOfSaleBanner
                    key={item.id}
                    onPress={() => {
                      if (!isConnectedToTheInternet) return;
                      navigate("/settings");
                    }}
                  />
                );
              case "gifts":
                return (
                  <GiftsPreview
                    key={item.id}
                    onPress={() => navigate("/settings")}
                  />
                );
              case "accumulation":
                return (
                  <AccumulationAddressesPreview
                    key={item.id}
                    onPress={() => navigate("/settings")}
                  />
                );
              default:
                return null;
            }
          })}
          <ThemeText
            textStyles={{ textAlign: "center" }}
            textContent={"Items coming soon..."}
          />
        </div>
      </div>
    </div>
  );
}
