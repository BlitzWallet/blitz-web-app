import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../components/themeText/themeText";
import useThemeColors from "../../../../hooks/useThemeColors";
import CheckCircle from "../../../../components/checkCircle/checkCircle";
import "./SelectContactRequestCurrency.css";
import { Colors } from "../../../../constants/theme";

export default function SelectContactRequestCurrency({
  theme,
  darkModeType,
  params,
  onClose,
}) {
  const { selectedRequestMethod = "BTC", onSelect } = params || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const btcCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.bitcoinOrange;
  const usdCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.dollarGreen;

  function handleSelect(term) {
    if (onSelect) {
      onSelect(term);
      onClose?.();
      return;
    }

    onClose?.();
    navigate("/sendAndRequestPage", {
      replace: true,
      state: { selectedRequestMethod: term },
    });
  }

  return (
    <div className="select-request-currency-container">
      <ThemeText
        textStyles={{ fontWeight: 500, fontSize: "1.1rem", marginBottom: 4 }}
        textContent={t("contacts.selectCurrencyToRequest.header")}
      />

      <div className="request-currency-options">
        <button
          className="request-currency-row"
          onClick={() => handleSelect("BTC")}
        >
          <div
            className="request-currency-icon-circle"
            style={{ backgroundColor: btcCircleBg }}
          >
            <img
              width={22}
              height={22}
              src={`/icons/bitcoinIcon.png`}
              alt="Bitcoin"
              className="icon-image"
            />
          </div>
          <ThemeText
            textStyles={{ margin: 0, flex: 1, textAlign: "left" }}
            textContent={t("constants.bitcoin_upper")}
          />
          <CheckCircle
            isActive={selectedRequestMethod === "BTC"}
            containerSize={25}
          />
        </button>

        <button
          className="request-currency-row"
          onClick={() => handleSelect("USD")}
        >
          <div
            className="request-currency-icon-circle"
            style={{ backgroundColor: usdCircleBg }}
          >
            <img
              width={22}
              height={22}
              src={`/icons/dollarIcon.png`}
              alt="USD"
              className="icon-image"
            />
          </div>
          <ThemeText
            textStyles={{ margin: 0, flex: 1, textAlign: "left" }}
            textContent={t("constants.dollars_upper")}
          />
          <CheckCircle
            isActive={selectedRequestMethod === "USD"}
            containerSize={25}
          />
        </button>
      </div>
    </div>
  );
}
