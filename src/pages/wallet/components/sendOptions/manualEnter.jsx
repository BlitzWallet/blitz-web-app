import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemeText from "../../../../components/themeText/themeText";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { aboutIcon } from "../../../../constants/icons";
import CustomButton from "../../../../components/customButton/customButton";
import handlePreSendPageParsing from "../../../../functions/sendBitcoin/handlePreSendPageParsing";
import { useState } from "react";
import "./manualEnter.css";
import { CONTENT_KEYBOARD_OFFSET } from "../../../../constants";
import openLinkToNewTab from "../../../../functions/openLinkToNewTab";
import { useOverlay } from "../../../../contexts/overlayContext";

export default function ManualEnterSendAddress() {
  const { openOverlay, closeOverlay } = useOverlay();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const onClose = closeOverlay;

  const [inputValue, setInputValue] = useState("");

  return (
    <div
      style={{ marginBottom: CONTENT_KEYBOARD_OFFSET }}
      className="manualEnterContainer"
    >
      <div className="infoContainer">
        <ThemeText
          className={"infoText"}
          textContent={t("wallet.homeLightning.manualEnterSendAddress.title")}
        />

        <ThemeImage
          clickFunction={() => {
            openOverlay({
              for: "informationPopup",
              textContent: t(
                "wallet.homeLightning.manualEnterSendAddress.paymentTypesDesc"
              ),
              buttonText: t("constants.understandText"),
            });
          }}
          className="image"
          styles={{ width: 20, height: 20 }}
          icon={aboutIcon}
        />
      </div>

      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="textInput"
      />

      <CustomButton
        buttonStyles={{
          alignSelf: "center",
          marginTop: "auto",
          opacity: !inputValue ? 0.5 : 1,
        }}
        actionFunction={hanldeSubmit}
        textContent={t("constants.continue")}
      />
    </div>
  );
  function hanldeSubmit() {
    if (!inputValue) return;

    const formattedInput = inputValue.trim();

    const response = handlePreSendPageParsing(formattedInput);

    if (response.error) {
      openOverlay({ for: "error", errorMessage: response.error });
      return;
    }

    if (response.navigateToWebView) {
      openLinkToNewTab(response.webViewURL, "blank");
      return;
    }
    onClose();
    navigate("/send", { state: { btcAddress: response.btcAdress } });
  }
}
