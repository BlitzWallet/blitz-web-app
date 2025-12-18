import "./settings.css";
import { useAuth } from "../../contexts/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import PageNavBar from "../../components/navBar/navBar";
import ThemeText from "../../components/themeText/themeText";
import { useEffect } from "react";
import SocialOptionsBottomBar from "./socialOptions/socialOptions";
import Icon from "../../components/customIcon/customIcon";
import { Colors } from "../../constants/theme";
import ThemeImage from "../../components/ThemeImage/themeImage";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import {
  aboutIcon,
  colorIcon,
  contactsIconBlue,
  currencyIcon,
  keyIcon,
  leftCheveronIcon,
  navigationIcon,
  nodeIcon,
  receiptIcon,
  trashIcon,
} from "../../constants/icons";
import { useOverlay } from "../../contexts/overlayContext";

const GENERALOPTIONS = [
  {
    for: "general",
    name: "About",
    icon: aboutIcon,
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "general",
    name: "Display Currency",
    icon: currencyIcon,
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "general",
    name: "Display Options",
    icon: colorIcon,
    arrowIcon: leftCheveronIcon,
  },

  {
    for: "general",
    name: "Edit Contact Profile",
    icon: contactsIconBlue,
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "general",
    name: "Fast Pay",
    svgIcon: true,
    svgName: "quickPayIcon",
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "general",
    name: "Blitz Stats",
    svgName: "crashDebugIcon",
    icon: navigationIcon,
    arrowIcon: leftCheveronIcon,
  },
];
const SECURITYOPTIONS = [
  {
    for: "Security & Customization",
    name: "Backup wallet",
    icon: keyIcon,
    arrowIcon: leftCheveronIcon,
  },
];

const ADVANCEDOPTIONS = [
  {
    for: "Closing Account",
    name: "Blitz Fee Details",
    icon: receiptIcon,
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "Closing Account",
    name: "Delete Wallet",
    icon: trashIcon,
    arrowIcon: leftCheveronIcon,
  },
  {
    for: "Closing Account",
    name: "Spark Info",
    icon: nodeIcon,
    arrowIcon: leftCheveronIcon,
  },
];
const SETTINGSOPTIONS = [
  [...GENERALOPTIONS],
  [...SECURITYOPTIONS],
  [...ADVANCEDOPTIONS],
];
const DOOMSDAYSETTINGS = [
  [
    {
      for: "Security & Customization",
      name: "Backup wallet",
      icon: keyIcon,
      arrowIcon: leftCheveronIcon,
    },
  ],
  [
    {
      for: "Closing Account",
      name: "Delete Wallet",
      icon: trashIcon,
      arrowIcon: leftCheveronIcon,
    },
  ],
];

export default function SettingsHome() {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const wantsToDeleteAccount = queryParams.get("confirmed");
  const props = location.state;
  const { deleteWallet } = useAuth();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset } = useThemeColors();
  const settignsList = props?.isDoomsday ? DOOMSDAYSETTINGS : SETTINGSOPTIONS;

  useEffect(() => {
    if (wantsToDeleteAccount !== "true") return;
    deleteWallet();
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }, [wantsToDeleteAccount]);

  const settingsItems = settignsList.map((item, id) => {
    const internalElements = item.map((settingsElement, id) => {
      return (
        <div
          style={{ borderBottomColor: backgroundOffset }}
          key={id}
          onClick={() => {
            if (settingsElement.name === "Delete Wallet") {
              openOverlay({
                for: "confirm-action",
                confirmHeader: "Are you sure you want to delete your wallet?",
                confirmDescription:
                  "Your wallet seed will be permanently deleted from this device. Without your wallet seed, your Bitcoin will be lost forever.",
                fromRoute: "settings",
              });
            } else {
              navigate("/settings-item", {
                state: {
                  for: settingsElement.name,
                },
              });
            }
          }}
          className="settingsItemContainer"
        >
          {settingsElement.svgIcon ? (
            <Icon
              color={
                theme && darkModeType ? Colors.dark.text : Colors.light.blue
              }
              name={settingsElement.svgName}
            />
          ) : (
            <ThemeImage
              className="settingsItemImage"
              icon={settingsElement.icon}
              styles={{ width: 20, height: 20 }}
            />
          )}
          <ThemeText
            className={"settingsItemName"}
            textContent={settingsElement.name}
          />
          <ThemeImage
            styles={{ width: 20, height: 20 }}
            className="settingsItemChevron"
            icon={settingsElement.arrowIcon}
          />
        </div>
      );
    });

    return (
      <div key={`itemContainer-${id}`} className="settingsItemGroupContainer">
        <ThemeText
          textStyles={{ marginTop: id === 0 ? 0 : 20 }}
          className={"settingsItemGroupHeader"}
          textContent={
            id === 0
              ? "General"
              : id === 1
              ? "Security"
              : id === 2
              ? "Technical Settings"
              : "Experimental Features"
          }
        />
        {internalElements}
      </div>
    );
  });

  return (
    <div className="settingsPage">
      <PageNavBar text="Settings" />
      <div className="contentContainer">
        {settingsItems}
        <SocialOptionsBottomBar />
      </div>
    </div>
  );
}
