import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bitcoin, DollarSign } from "lucide-react";
import ThemeText from "../../../components/themeText/themeText";
import CheckCircle from "../../../components/checkCircle/checkCircle";
import useThemeColors from "../../../hooks/useThemeColors";
import { useThemeContext } from "../../../contexts/themeContext";
import { useUserBalanceContext } from "../../../contexts/userBalanceContext";
import { useGlobalContextProvider } from "../../../contexts/masterInfoObject";
import { useNodeContext } from "../../../contexts/nodeContext";
import displayCorrectDenomination from "../../../functions/displayCorrectDenomination";
import formatBalanceAmount from "../../../functions/formatNumber";
import "./selectPaymentMethod.css";
import { Colors } from "../../../constants/theme";

export default function SelectPaymentMethod({ params, onClose }) {
  const { selectedPaymentMethod, fromPage, onSelect } = params || {};
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { bitcoinBalance, dollarBalanceToken } = useUserBalanceContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const hideBalance = fromPage === "CreateGift";

  const headerText = hideBalance
    ? t("screens.inAccount.giftPages.balanceDenominationHeader")
    : t("wallet.sendPages.selectPaymentMethod.header");

  const btcCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.bitcoinOrange;
  const usdCircleBg =
    theme && darkModeType ? backgroundColor : Colors.constants.dollarGreen;

  function handleSelect(term) {
    if (onSelect) {
      onSelect(term);
      onClose();
    } else {
      onClose();
      if (fromPage) {
        navigate(fromPage, {
          state: { selectedPaymentMethod: term },
          replace: false,
        });
      }
    }
  }

  const btcBalance = displayCorrectDenomination({
    amount: bitcoinBalance,
    masterInfoObject: { ...masterInfoObject, userBalanceDenomination: "sats" },
    fiatStats,
  });

  const usdBalance = displayCorrectDenomination({
    amount: formatBalanceAmount(dollarBalanceToken, false, masterInfoObject),
    masterInfoObject: { ...masterInfoObject, userBalanceDenomination: "fiat" },
    forceCurrency: "USD",
    convertAmount: false,
    fiatStats,
  });

  return (
    <div className="select-payment-container">
      <ThemeText
        textStyles={{ fontWeight: 500, fontSize: "1.1rem", marginBottom: 4 }}
        textContent={headerText}
      />

      <div className="payment-options">
        <button className="option-row" onClick={() => handleSelect("BTC")}>
          <div className="icon-circle" style={{ backgroundColor: btcCircleBg }}>
            <img
              width={22}
              height={22}
              src={`/icons/bitcoinIcon.png`}
              alt="icon"
              className="icon-image"
            />
          </div>
          <div className="payment-text">
            <ThemeText
              textStyles={{ margin: 0, fontSize: "1.1rem" }}
              textContent={t(
                hideBalance
                  ? "constants.bitcoin_upper"
                  : "constants.sat_balance",
              )}
            />
            {!hideBalance && (
              <ThemeText
                textStyles={{ opacity: 0.7, margin: 0, fontSize: "0.85rem" }}
                textContent={btcBalance}
              />
            )}
          </div>
          <CheckCircle
            isActive={
              selectedPaymentMethod === "BTC" ||
              selectedPaymentMethod === "user-choice"
            }
            containerSize={25}
          />
        </button>

        <button className="option-row" onClick={() => handleSelect("USD")}>
          <div className="icon-circle" style={{ backgroundColor: usdCircleBg }}>
            <img
              width={22}
              height={22}
              src={`/icons/dollarIcon.png`}
              alt="icon"
              className="icon-image"
            />
          </div>
          <div className="payment-text">
            <ThemeText
              textStyles={{ margin: 0, fontSize: "1.1rem" }}
              textContent={t(
                hideBalance
                  ? "constants.dollars_upper"
                  : "constants.usd_balance",
              )}
            />
            {!hideBalance && (
              <ThemeText
                textStyles={{ opacity: 0.7, margin: 0, fontSize: "0.85rem" }}
                textContent={usdBalance}
              />
            )}
          </div>
          <CheckCircle
            isActive={selectedPaymentMethod === "USD"}
            containerSize={25}
          />
        </button>
      </div>
    </div>
  );
}
