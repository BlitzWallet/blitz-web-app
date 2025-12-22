import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import ThemeText from "../../components/themeText/themeText";
import SocialOptionsBottomBar from "./socialOptions/socialOptions";
import ContactProfileImage from "../contacts/components/profileImage/profileImage";
import "./settings.css";
import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  Edit,
  ScanLine,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../contexts/themeContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { Colors } from "../../constants/theme";
import BackArrow from "../../components/backArrow/backArrow";
import CustomSettingsNavBar from "../../components/customSettingsNavbar";
import useThemeColors from "../../hooks/useThemeColors";
import * as LucidIcons from "lucide-react";
import CustomButton from "../../components/customButton/customButton";
import { useOverlay } from "../../contexts/overlayContext";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useGlobalContacts } from "../../contexts/globalContacts";

const PREFERENCES = [
  {
    for: "general",
    name: "Display Currency",
    displayName: "screens.inAccount.settingsContent.display currency",
    icon: "Coins",
  },
  // {
  //   for: "general",
  //   name: "Language",
  //   displayName: "screens.inAccount.settingsContent.language",
  //   icon: "Languages",
  // },
  {
    for: "general",
    name: "Display Options",
    displayName: "screens.inAccount.settingsContent.display options",
    icon: "Palette",
  },
  {
    for: "general",
    name: "Fast Pay",
    displayName: "screens.inAccount.settingsContent.fast pay",
    icon: "ClockFading",
  },
];

const OTHEROPTIONS = [
  {
    for: "general",
    name: "About",
    displayName: "screens.inAccount.settingsContent.about",
    icon: "Info",
  },

  {
    for: "general",
    name: "Blitz Stats",
    displayName: "screens.inAccount.settingsContent.blitz stats",
    icon: "ChartArea",
  },
  {
    for: "Closing Account",
    name: "Delete Wallet",
    displayName: "screens.inAccount.settingsContent.delete wallet",
    icon: "Trash",
  },
];
const SECURITYOPTIONS = [
  // {
  //   for: "Security & Customization",
  //   name: "Login Mode",
  //   displayName: "screens.inAccount.settingsContent.login mode",
  // },
  {
    for: "Security & Customization",
    name: "Backup wallet",
    displayName: "screens.inAccount.settingsContent.backup wallet",
    icon: "KeyRound",
  },
];

const ADVANCEDOPTIONS = [
  {
    for: "Closing Account",
    name: "Spark Info",
    displayName: "screens.inAccount.settingsContent.spark info",
    icon: "Network",
  },
  // {
  //   for: "general",
  //   name: "Accounts",
  //   displayName: "screens.inAccount.settingsContent.accounts",
  // },
  // {
  //   for: "general",
  //   name: "Nostr",
  //   displayName: "screens.inAccount.settingsContent.nostr",
  // },
  // {
  //   for: "Closing Account",
  //   name: "Blitz Fee Details",
  //   displayName: "screens.inAccount.settingsContent.blitz fee details",
  // },

  // {
  //   for: "general",
  //   name: "ViewAllSwaps",
  //   displayName: "screens.inAccount.settingsContent.view all swaps",
  // },
];
const SETTINGSOPTIONS = [
  [...PREFERENCES],
  [...SECURITYOPTIONS],
  [...ADVANCEDOPTIONS],
  [...OTHEROPTIONS],
  // [...EXPIRIMENTALFEATURES],
];
const DOOMSDAYSETTINGS = [
  [
    {
      for: "Security & Customization",
      name: "Backup wallet",
      displayName: "screens.inAccount.settingsContent.backup wallet",
      icon: "KeyRound",
    },
  ],
  [
    {
      for: "Closing Account",
      name: "Delete Wallet",
      displayName: "screens.inAccount.settingsContent.delete wallet",
      icon: "Trash",
    },
  ],
];

export default function SettingsIndex() {
  const { t } = useTranslation();
  const { openOverlay } = useOverlay();
  const { cache } = useImageCache();
  const location = useLocation();
  const props = location.state || {};
  const isDoomsday = props.isDoomsday;
  const { theme, darkModeType } = useThemeContext();
  const { globalContactsInformation } = useGlobalContacts();
  const { masterInfoObject } = useGlobalContextProvider();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const navigate = useNavigate();
  const settignsList = isDoomsday
    ? DOOMSDAYSETTINGS
    : [PREFERENCES, SECURITYOPTIONS, ADVANCEDOPTIONS, OTHEROPTIONS];
  const myProfileImage = masterInfoObject?.profileImage;
  const myContact = globalContactsInformation?.myProfile;
  console.log(globalContactsInformation);

  const settingsElements = useMemo(() => {
    return settignsList.map((section, sectionIndex) => {
      return (
        <div className="options-container" key={sectionIndex}>
          <ThemeText
            textContent={
              sectionIndex === 0
                ? "Preferences"
                : sectionIndex === 1
                ? "Security"
                : sectionIndex === 2
                ? "Technical Settings"
                : ""
            }
            className="options-title"
          />

          <div
            style={{ backgroundColor: backgroundOffset }}
            className="options-list-container"
          >
            {section.map((element, idx) => {
              const IconElement = LucidIcons[element.icon];
              return (
                <div
                  className="list-container"
                  style={{ borderBottomColor: backgroundColor }}
                  key={idx}
                  onClick={() => {
                    if (element.name === "Delete Wallet") {
                      openOverlay({
                        for: "confirm-action",
                        confirmHeader:
                          "Are you sure you want to delete your wallet?",
                        confirmDescription:
                          "Your wallet seed will be permanently deleted from this device. Without your wallet seed, your Bitcoin will be lost forever.",
                        fromRoute: "settings",
                      });
                    } else {
                      navigate(`/settings-item`, {
                        state: { for: element.name },
                      });
                    }
                  }}
                >
                  <IconElement
                    color={
                      theme && darkModeType
                        ? Colors.dark.text
                        : Colors.constants.blue
                    }
                  />

                  <ThemeText
                    textContent={t(element.displayName)}
                    className="list-text"
                    textStyles={{
                      textTransform:
                        element.name === "Experimental" ? "none" : "capitalize",
                    }}
                  />

                  {element.name === "Display Currency" && (
                    <ThemeText
                      textContent={masterInfoObject?.fiatCurrency}
                      className="inline-settings-description"
                      textStyles={{ textTransform: "uppercase" }}
                    />
                  )}
                  {element.name === "Language" && (
                    <ThemeText
                      textContent={masterInfoObject?.language}
                      className="inline-settings-description"
                      textStyles={{ textTransform: "capitalize" }}
                    />
                  )}

                  <ChevronRight
                    color={
                      theme && darkModeType
                        ? Colors.dark.text
                        : Colors.constants.blue
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [settignsList, t, theme, darkModeType, backgroundOffset, backgroundColor]);

  return (
    <div className="global-container">
      <CustomSettingsNavBar
        showLeftImage={!isDoomsday}
        LeftImageIcon={Upload}
        text={!isDoomsday ? "Profile" : "Settings"}
        leftImageFunction={() => {
          navigator.share?.({
            title: "Share Contact",
            url: `https://blitzwalletapp.com/u/${myContact?.uniqueName}`,
          });
        }}
      />

      <div className="settings-container">
        {!isDoomsday && (
          <div
            style={{ borderBottomColor: backgroundOffset }}
            className="profile-container"
          >
            <div
              style={{ backgroundColor: backgroundOffset }}
              className="profile-image"
            >
              <ContactProfileImage
                updated={cache[masterInfoObject?.uuid]?.updated}
                uri={cache[masterInfoObject?.uuid]?.localUri}
                theme={theme}
                darkModeType={darkModeType}
              />
            </div>

            <ThemeText
              textContent={myContact?.name || "Anonymous"}
              textStyles={{
                opacity: myContact?.name ? 0.5 : 0.8,
                marginBottom: 0,
              }}
            />
            <ThemeText
              textStyles={{ margin: 0, marginBottom: 40 }}
              textContent={`@${myContact?.uniqueName}`}
              className="profile-unique-name"
            />

            <div className="button-container">
              <div
                style={{
                  borderColor: backgroundOffset,
                }}
                className="button"
                onClick={() =>
                  navigate(`/settings-item`, {
                    state: { for: "edit contact profile" },
                  })
                }
              >
                <Edit
                  color={theme ? Colors.dark.text : Colors.light.text}
                  size={20}
                />
                <ThemeText
                  className={"profileActionBTNText"}
                  textContent="Edit Profile"
                />
              </div>

              <div
                style={{
                  borderColor: backgroundOffset,
                }}
                className="button"
                onClick={() => navigate("/profile-qr")}
              >
                <ScanLine
                  color={theme ? Colors.dark.text : Colors.light.text}
                  size={20}
                />

                <ThemeText
                  className={"profileActionBTNText"}
                  textContent="Show QR"
                />
              </div>
            </div>
          </div>
        )}

        {settingsElements}

        {isDoomsday && (
          <button
            className="pos-container"
            onClick={() =>
              window.open("https://recover.blitzwalletapp.com", "_blank")
            }
          >
            <ThemeText content="Blitz Restore" className="pos-text" />
          </button>
        )}

        {!isDoomsday && (
          <>
            {/* <div
              style={{
                borderColor:
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.primary,
              }}
              className="pos-container"
              onClick={() => navigate("/settings/point-of-sale")}
            >
              <Calculator
                color={
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.primary
                }
              />
              <ThemeText
                textStyles={{
                  color:
                    theme && darkModeType
                      ? Colors.dark.text
                      : Colors.constants.primary,
                }}
                textContent="Point-of-sale"
                className="pos-text"
              />
            </div> */}

            <SocialOptionsBottomBar />
          </>
        )}
      </div>
    </div>
  );
}
