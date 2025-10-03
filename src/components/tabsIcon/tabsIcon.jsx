import {
  adminHomeWallet,
  appstore,
  appstoreFilled,
  contactsIconBlue,
  contactsIconBlueSelected,
  walletBlueIcon,
} from "../../constants/icons";

export default function TabsIcon({ value, icon, theme, darkModeType }) {
  let imgSrc =
    icon === "contacts"
      ? value === 0
        ? contactsIconBlueSelected
        : contactsIconBlue
      : icon === "wallet"
      ? value === 1
        ? walletBlueIcon
        : adminHomeWallet
      : value === 2
      ? appstoreFilled
      : appstore;
  return (
    <img
      style={{
        height: "20px",
        width: "20px",
        filter:
          theme && darkModeType
            ? "brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(134deg) brightness(111%) contrast(101%)"
            : "unset",
      }}
      src={imgSrc}
    />
  );
}
