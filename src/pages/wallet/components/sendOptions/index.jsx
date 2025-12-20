// import {
//   navigateToSendUsingClipboard,
//   getQRImage,
// } from "../../../../functions";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemeText from "../../../../components/themeText/themeText";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useThemeContext } from "../../../../contexts/themeContext";
import * as LucidIcons from "lucide-react";

import "./style.css";
import {
  clipboardDark,
  contactsIcon,
  editIcon,
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
    const darkIcon =
      item === "img"
        ? ImagesIconDark
        : item === "clipboard"
        ? clipboardDark
        : editIcon;

    const iconName =
      item === "img" ? "Image" : item === "clipboard" ? "Clipboard" : "Edit";

    const IconElement = LucidIcons[iconName];

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
          <IconElement style={styles.icon} size={35} />
          <ThemeText textStyles={styles.optionText} textContent={itemText} />
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
            onClick={() => {}}
            style={{
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={styles.optionRow}>
              <LucidIcons.Users style={styles.icon} />
              <ThemeText
                textStyles={{ ...styles.optionText }}
                textContent={t("wallet.halfModal.contacts")}
              />
            </div>
          </button>
        )}
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
