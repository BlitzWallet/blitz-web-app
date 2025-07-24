import contactsNoFill from "../../assets/contactsIconBlue.png";
import contactsFill from "../../assets/contactsIconSelected.png";
import walletNoFill from "../../assets/adminHomeWallet.png";
import walletFill from "../../assets/wallet_blue.png";
import storeNoFill from "../../assets/appStore.png";
import storeFill from "../../assets/appStoreFilled.png";

export default function TabsIcon({ value, icon, theme, darkModeType }) {
  let imgSrc =
    icon === "contacts"
      ? value === 0
        ? contactsFill
        : contactsNoFill
      : icon === "wallet"
      ? value === 1
        ? walletFill
        : walletNoFill
      : value === 2
      ? storeFill
      : storeNoFill;
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
