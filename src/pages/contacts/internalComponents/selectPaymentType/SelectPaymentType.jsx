import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bitcoin, DollarSign, Gift } from "lucide-react";
import ThemeText from "../../../../components/themeText/themeText";
import CustomButton from "../../../../components/customButton/customButton";
import useThemeColors from "../../../../hooks/useThemeColors";
import { HIDE_IN_APP_PURCHASE_ITEMS } from "../../../../constants";
import { Colors } from "../../../../constants/theme";
import "./selectPaymentType.css";
import CheckCircle from "../../../../components/checkCircle/checkCircle";

export default function SelectPaymentType({
  theme,
  darkModeType,
  params,
  onClose,
}) {
  const { paymentType, selectedContact, imageData } = params || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const [selectedOption, setSelectedOption] = useState("BTC");

  const btcCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.bitcoinOrange;
  const usdCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.dollarGreen;
  const giftCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.blue;

  function handleNext() {
    onClose();
    if (selectedOption === "Gift") {
      navigate("/selectGiftCardForContacts", {
        state: { selectedContact, imageData },
      });
    } else {
      navigate("/sendAndRequestPage", {
        state: {
          selectedContact,
          paymentType,
          imageData,
          endReceiveType: selectedOption,
          [paymentType === "send"
            ? "selectedPaymentMethod"
            : "selectedRequestMethod"]: selectedOption,
        },
      });
    }
  }

  const headerKey =
    paymentType === "request"
      ? "contacts.selectCurrencyToRequest.header"
      : "contacts.selectCurrencyToSend.header";

  return (
    <div className="select-payment-container">
      <ThemeText
        textStyles={{ fontWeight: 500, fontSize: "1.3rem", marginBottom: 4 }}
        textContent={t(headerKey)}
      />

      <div className="payment-options">
        <button
          className={`option-row${selectedOption === "BTC" ? " selected" : ""}`}
          onClick={() => setSelectedOption("BTC")}
        >
          <div className="icon-circle" style={{ backgroundColor: btcCircleBg }}>
            <img
              width={20}
              height={20}
              src={`/icons/bitcoinIcon.png`}
              alt="icon"
              className="icon-image"
            />
          </div>
          <ThemeText
            textStyles={{
              margin: 0,
              flex: 1,
              textAlign: "left",
              fontWeight: 500,
              fontSize: "1.1rem",
            }}
            textContent={t("constants.bitcoin_upper")}
          />
          <CheckCircle containerSize={25} isActive={selectedOption === "BTC"} />
        </button>

        <button
          className={`option-row${selectedOption === "USD" ? " selected" : ""}`}
          onClick={() => setSelectedOption("USD")}
        >
          <div className="icon-circle" style={{ backgroundColor: usdCircleBg }}>
            <img
              width={20}
              height={20}
              src={`/icons/dollarIcon.png`}
              alt="icon"
              className="icon-image"
            />
          </div>
          <ThemeText
            textStyles={{
              margin: 0,
              flex: 1,
              textAlign: "left",
              fontWeight: 500,
              fontSize: "1.1rem",
            }}
            textContent={t("constants.dollars_upper")}
          />
          <CheckCircle containerSize={25} isActive={selectedOption === "USD"} />
        </button>

        {/* {!HIDE_IN_APP_PURCHASE_ITEMS && paymentType !== "request" && (
          <button
            className={`option-row${selectedOption === "Gift" ? " selected" : ""}`}
            style={selectedOption === "Gift" ? { backgroundColor: backgroundOffset } : {}}
            onClick={() => setSelectedOption("Gift")}
          >
            <div className="icon-circle" style={{ backgroundColor: giftCircleBg }}>
              <Gift size={22} color="white" />
            </div>
            <ThemeText
              textStyles={{ margin: 0, flex: 1, textAlign: "left" }}
              textContent={t("constants.gift")}
            />
            {selectedOption === "Gift" && (
              <div
                className="check-circle"
                style={{ backgroundColor: Colors.constants.blue }}
              />
            )}
          </button>
        )} */}
      </div>

      <CustomButton
        buttonStyles={{ marginTop: "auto", width: "max-content" }}
        textContent={t("constants.next")}
        actionFunction={handleNext}
      />
    </div>
  );
}
