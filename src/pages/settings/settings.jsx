import "./settings.css";
import { useAuth } from "../../contexts/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import PageNavBar from "../../components/navBar/navBar";
import ThemeText from "../../components/themeText/themeText";
import { useEffect } from "react";
import SocialOptionsBottomBar from "./socialOptions/socialOptions";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useOverlay } from "../../contexts/overlayContext";
import * as LucidIcons from "lucide-react";
import CustomSettingsNavBar from "../../components/customSettingsNavbar";

const GENERALOPTIONS = [
  {
    for: "general",
    name: "About",
    newIconName: "Info",
  },
  {
    for: "general",
    name: "Display Currency",
    newIconName: "Coins",
  },
  {
    for: "general",
    name: "Display Options",
    newIconName: "Palette",
  },

  {
    for: "general",
    name: "Edit Contact Profile",
    newIconName: "UserPen",
  },
  {
    for: "general",
    name: "Fast Pay",
    newIconName: "ClockFading",
  },
  {
    for: "general",
    name: "Blitz Stats",
    newIconName: "ChartArea",
  },
];

const SECURITYOPTIONS = [
  {
    for: "Security & Customization",
    name: "Backup wallet",
    newIconName: "KeyRound",
  },
];

const ADVANCEDOPTIONS = [
  {
    for: "Closing Account",
    name: "Blitz Fee Details",
    newIconName: "ReceiptText",
  },
  {
    for: "Closing Account",
    name: "Delete Wallet",
    newIconName: "Trash",
  },
  {
    for: "Closing Account",
    name: "Spark Info",
    newIconName: "Asterisk",
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
      newIconName: "KeyRound",
    },
  ],
  [
    {
      for: "Closing Account",
      name: "Delete Wallet",
      newIconName: "Trash",
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
      const IconElemnt = LucidIcons[settingsElement.newIconName];
      console.log(IconElemnt, settingsElement.newIconName);
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
          <IconElemnt
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
          />
          <ThemeText
            className={"settingsItemName"}
            textContent={settingsElement.name}
          />
          <LucidIcons.ChevronRight
            size={20}
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
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
      <CustomSettingsNavBar text="Settings" />
      <div className="contentContainer">
        {settingsItems}
        <SocialOptionsBottomBar />
      </div>
    </div>
  );
}
