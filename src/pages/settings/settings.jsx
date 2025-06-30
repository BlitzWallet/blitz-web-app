import BackArrow from "../../components/backArrow/backArrow";
import { useSpark } from "../../contexts/sparkContext";
import "./settings.css";
import clipbardIcon from "../../assets/clipboardIcon.png";
import copyToClipboard from "../../functions/copyToClipboard";
import shareIcon from "../../assets/share.png";
import { useAuth } from "../../contexts/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import PageNavBar from "../../components/navBar/navBar";
import aboutIcon from "../../assets/aboutIcon.png";
import aboutIconWhite from "../../assets/aboutIconWhite.png";
import leftCheveronArrow from "../../assets/left-chevron.png";
import currencyIcon from "../../assets/currencyIcon.png";
import currencyIconWhite from "../../assets/currencyIconWhite.png";
import colorIcon from "../../assets/colorIcon.png";
import colorIconWhite from "../../assets/colorIconWhite.png";
import contactsIconBlue from "../../assets/contactsIconBlue.png";
import contactsIconWhite from "../../assets/contactsIconWhite.png";
import navigationIcon from "../../assets/navigation.png";
import navigationIconWhite from "../../assets/navigation_white.png";
import keyIcon from "../../assets/keyIcon.png";
import keyIconWhite from "../../assets/keyIconWhite.png";
import trashIcon from "../../assets/trashIcon.png";
import trashIconWhite from "../../assets/trashIconWhite.png";
import nodeIcon from "../../assets/nodeIcon.png";
import nodeIconWhite from "../../assets/nodeIconWhite.png";
import ThemeText from "../../components/themeText/themeText";
import { useEffect } from "react";
const GENERALOPTIONS = [
  {
    for: "general",
    name: "About",
    icon: aboutIcon,
    iconWhite: aboutIconWhite,
    arrowIcon: leftCheveronArrow,
  },
  {
    for: "general",
    name: "Display Currency",
    icon: currencyIcon,
    iconWhite: currencyIconWhite,
    arrowIcon: leftCheveronArrow,
  },
  {
    for: "general",
    name: "Display Options",
    icon: colorIcon,
    iconWhite: colorIconWhite,
    arrowIcon: leftCheveronArrow,
  },

  // {
  //   for: "general",
  //   name: "Edit Contact Profile",
  //   icon: contactsIconBlue,
  //   iconWhite: contactsIconWhite,
  //   arrowIcon: leftCheveronArrow,
  // },
  // {
  //   for: "general",
  //   name: "Fast Pay",
  //   svgIcon: true,
  //   svgName: "quickPayIcon",
  //   arrowIcon: leftCheveronArrow,
  // },
  // {
  //   for: "general",
  //   name: "Blitz Stats",
  //   svgName: "crashDebugIcon",
  //   icon: navigationIcon,
  //   iconWhite: navigationIconWhite,
  //   arrowIcon: leftCheveronArrow,
  // },
];
const SECURITYOPTIONS = [
  {
    for: "Security & Customization",
    name: "Backup wallet",
    icon: keyIcon,
    iconWhite: keyIconWhite,
    arrowIcon: leftCheveronArrow,
  },
];

const ADVANCEDOPTIONS = [
  {
    for: "Closing Account",
    name: "Delete Wallet",
    icon: trashIcon,
    iconWhite: trashIconWhite,
    arrowIcon: leftCheveronArrow,
  },
  {
    for: "Closing Account",
    name: "Spark Info",
    icon: nodeIcon,
    iconWhite: nodeIconWhite,
    arrowIcon: leftCheveronArrow,
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
      iconWhite: keyIconWhite,
      arrowIcon: leftCheveronArrow,
    },
  ],
  [
    {
      for: "Closing Account",
      name: "Delete Wallet",
      icon: trashIcon,
      iconWhite: trashIconWhite,
      arrowIcon: leftCheveronArrow,
    },
  ],
];

export default function SettingsHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const wantsToDeleteAccount = queryParams.get("confirmed");
  const props = location.state;
  const { deleteWallet } = useAuth();
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
          key={id}
          onClick={() => {
            if (settingsElement.name === "Delete Wallet") {
              navigate("/confirm-action", {
                state: {
                  confirmHeader: "Are you sure you want to delete your wallet?",
                  confirmDescription:
                    "Your wallet seed will be permanently deleted from this device. Without your wallet seed, your Bitcoin will be lost forever.",
                  fromRoute: "settings",
                  background: location,
                },
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
          <img className="settingsItemImage" src={settingsElement.icon} />
          <ThemeText
            className={"settingsItemName"}
            textContent={settingsElement.name}
          />
          <img
            className="settingsItemChevron"
            src={settingsElement.arrowIcon}
          />
        </div>
      );
    });

    return (
      <div key={`itemContainer-${id}`} className="settingsItemGroupContainer">
        <ThemeText
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
      <div className="contentContainer">{settingsItems}</div>
    </div>
  );
}
