// import {
//   navigateToSendUsingClipboard,
//   getQRImage,
// } from "../../../../functions";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemeText from "../../../../components/themeText/themeText";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import Icon from "../../../../components/customIcon/customIcon";
import { useThemeContext } from "../../../../contexts/themeContext";

import imagesIcon from "../../../../assets/imagesDark.png";
import clipbardIconLight from "../../../../assets/clipboardLight.png";
import editIcon from "../../../../assets/edit.png";
import "./style.css";

export default function HalfModalSendOptions({ openOverlay, onClose }) {
  const navigate = useNavigate();
  const { theme } = useThemeContext();

  const { decodedAddedContacts } = useGlobalContacts();
  const { t } = useTranslation();

  const sendOptionElements = ["img", "clipboard", "manual"].map((item, key) => {
    const lightIcon =
      item === "img"
        ? imagesIcon
        : item === "clipboard"
        ? clipbardIconLight
        : editIcon;

    const darkIcon = lightIcon;
    //   item === "img"
    //     ? ICONS.ImagesIconDark
    //     : item === "clipboard"
    //     ? ICONS.clipboardDark
    //     : ICONS.editIcon;

    const itemText =
      item === "img"
        ? t("wallet.halfModal.images")
        : item === "clipboard"
        ? t("wallet.halfModal.clipboard")
        : t("wallet.halfModal.manual");

    const handlePress = async () => {
      if (item === "img") {
        const response = await getQRImage();
        if (response.error) {
          navigate("ErrorScreen", { errorMessage: t(response.error) });
          return;
        }
        if (!response.didWork || !response.btcAdress) return;
        navigate("ConfirmPaymentScreen", {
          btcAdress: response.btcAdress,
          fromPage: "",
        });
      } else if (item === "clipboard") {
        navigateToSendUsingClipboard(navigate, "modal", undefined, t);
      } else {
        navigate("CustomHalfModal", {
          wantedContent: "manualEnterSendAddress",
          sliderHeight: 0.5,
        });
      }
    };

    return (
      <button
        key={key}
        onClick={handlePress}
        style={{
          background: "transparent",
          border: "none",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={styles.optionRow}>
          {item === "manual" ? (
            <div
              style={{
                ...styles.icon,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon color={"blue"} height={30} width={30} name={"editIcon"} />
            </div>
          ) : (
            <ThemeImage
              styles={styles.icon}
              lightModeIcon={darkIcon}
              darkModeIcon={lightIcon}
              lightsOutIcon={lightIcon}
            />
          )}
          <ThemeText styles={styles.optionText} content={itemText} />
        </div>
      </button>
    );
  });

  return (
    <div className="sendOptionsContainer">
      <div style={{ overflowY: "auto", overflowX: "hidden" }}>
        {sendOptionElements}
        {decodedAddedContacts.length !== 0 && (
          <button
            onClick={() => {
              navigate("ChooseContactHalfModal");
            }}
            style={{
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={styles.optionRow}>
              {/* <ThemeImage
                styles={styles.icon}
                lightModeIcon={ICONS.contactsIcon}
                darkModeIcon={ICONS.contactsIconLight}
                lightsOutIcon={ICONS.contactsIconLight}
              /> */}
              <ThemeText
                styles={{ ...styles.optionText }}
                content={t("wallet.halfModal.contacts")}
              />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  containerStyles: {
    flex: 1,
    width: "100%",
  },
  optionRow: {
    width: "90%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginLeft: "auto",
    marginRight: "auto",
  },
  optionText: {
    // fontSize: SIZES.large,
  },
  icon: {
    width: 35,
    height: 35,
    marginRight: 15,
  },
};
