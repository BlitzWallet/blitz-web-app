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

import "./style.css";
import {
  clipboardDark,
  clipboardLight,
  contactsIcon,
  contactsIconLight,
  editIcon,
  ImagesIcon,
  ImagesIconDark,
} from "../../../../constants/icons";
import {
  getQRImage,
  navigateToSendUsingClipboard,
} from "../../../../functions/sendBitcoin/halfModalFunctions";

export default function HalfModalSendOptions({ openOverlay, onClose }) {
  const navigate = useNavigate();
  const { theme } = useThemeContext();
  const fileInput = document.getElementById("file-selector");
  const { decodedAddedContacts } = useGlobalContacts();
  const { t } = useTranslation();

  const sendOptionElements = ["img", "clipboard", "manual"].map((item, key) => {
    const lightIcon =
      item === "img"
        ? ImagesIcon
        : item === "clipboard"
        ? clipboardLight
        : editIcon;

    const darkIcon =
      item === "img"
        ? ImagesIconDark
        : item === "clipboard"
        ? clipboardDark
        : editIcon;

    const itemText =
      item === "img"
        ? t("wallet.halfModal.images")
        : item === "clipboard"
        ? t("wallet.halfModal.clipboard")
        : t("wallet.halfModal.manual");

    const handlePress = async () => {
      if (item === "img") {
        const response = await getQRImage(fileInput);
        console.log(response);
        if (response.error) {
          openOverlay({
            for: "error",
            errorMessage: t(response.error),
          });

          return;
        }
        console.log(
          !response.didWork || !response.btcAdress,
          !response.didWork,
          !response.btcAdress
        );
        if (!response.didWork || !response.btcAdress) return;
        onClose();
        navigate("/send", { state: { btcAddress: response.btcAdress } });
      } else if (item === "clipboard") {
        const response = await navigateToSendUsingClipboard();

        if (!response.didWork) {
          openOverlay({
            for: "error",
            errorMessage:
              response.errorMessage || t("errormessages.genericError"),
          });
          return;
        }
        onClose();
        navigate("/send", { state: { btcAddress: response.data } });
      } else {
        onClose();
        openOverlay({
          for: "halfModal",
          contentType: "manualEnterSendAddress",
          params: {},
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
              <Icon
                color={theme ? "white" : "black"}
                height={30}
                width={30}
                name={"editIcon"}
              />
            </div>
          ) : (
            <ThemeImage
              styles={styles.icon}
              lightModeIcon={darkIcon}
              darkModeIcon={lightIcon}
              lightsOutIcon={lightIcon}
            />
          )}
          <ThemeText textStyles={styles.optionText} textContent={itemText} />
        </div>
      </button>
    );
  });

  return (
    <div className="sendOptionsContainer">
      <div style={{ overflowY: "auto", overflowX: "hidden" }}>
        {sendOptionElements}
        {/* {decodedAddedContacts.length !== 0 && (
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
              <ThemeImage
                styles={styles.icon}
                lightModeIcon={contactsIcon}
                darkModeIcon={contactsIconLight}
                lightsOutIcon={contactsIconLight}
              />
              <ThemeText
                textStyles={{ ...styles.optionText }}
                textContent={t("wallet.halfModal.contacts")}
              />
            </div>
          </button>
        )} */}
      </div>
      <input
        style={{ zIndex: -1, display: "none" }}
        hidden
        type="file"
        id="file-selector"
        accept="image/*"
      />
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
    fontSize: "1.2rem",
    margin: "0",
  },
  icon: {
    width: 35,
    height: 35,
    marginRight: 15,
  },
};
