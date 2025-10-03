import {
  adminHomeWallet,
  appstore,
  appstoreFilled,
  contactsIconBlue,
  contactsIconBlueSelected,
  walletBlueIcon,
} from "../../constants/icons";
import ThemeImage from "../ThemeImage/themeImage";

export default function TabsIcon({ value, icon }) {
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
    <ThemeImage styles={{ height: "20px", width: "20px" }} icon={imgSrc} />
  );
}
