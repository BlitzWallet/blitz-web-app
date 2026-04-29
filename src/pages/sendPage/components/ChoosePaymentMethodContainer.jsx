import ThemeIcon from "../../../components/themeIcon";
import ThemeImage from "../../../components/ThemeImage/themeImage";
import ThemeText from "../../../components/themeText/themeText";
import { Colors } from "../../../constants/theme";
import displayCorrectDenomination from "../../../functions/displayCorrectDenomination";
import formatBalanceAmount from "../../../functions/formatNumber";
import useThemeColors from "../../../hooks/useThemeColors";
import "./choosePaymentMethodContainer.css";

export default function ChoosePaymentMethod({
  theme,
  darkModeType,
  determinePaymentMethod,
  handleSelectPaymentMethod,
  bitcoinBalance,
  dollarBalanceToken,
  masterInfoObject,
  fiatStats,
  uiState,
  t,
  showBitcoinCardOnly = false,
  containerStyles = {},
  hideBalance = false,
}) {
  const { backgroundColor } = useThemeColors();

  const isBTC =
    determinePaymentMethod === "BTC" ||
    determinePaymentMethod === "user-choice";

  const icon =
    determinePaymentMethod === "BTC" || determinePaymentMethod === "user-choice"
      ? "bitcoinIcon"
      : "dollarIcon";

  const iconBackgroundColor =
    determinePaymentMethod === "BTC" || determinePaymentMethod === "user-choice"
      ? "bitcoinOrange"
      : "dollarGreen";

  const showHiddenBalance =
    masterInfoObject.userBalanceDenomination === "hidden";

  const balance =
    determinePaymentMethod === "BTC" || determinePaymentMethod === "user-choice"
      ? displayCorrectDenomination({
          amount: bitcoinBalance,
          masterInfoObject: {
            ...masterInfoObject,
            userBalanceDenomination: "sats",
          },
          fiatStats,
        })
      : displayCorrectDenomination({
          amount: formatBalanceAmount(
            dollarBalanceToken,
            false,
            masterInfoObject,
          ),
          masterInfoObject: {
            ...masterInfoObject,
            userBalanceDenomination: "fiat",
          },
          forceCurrency: "USD",
          convertAmount: false,
          fiatStats,
        });

  return (
    <div
      className="payment-method-container"
      style={{
        marginTop: uiState === "CHOOSE_METHOD" ? 30 : 5,
        ...containerStyles,
      }}
    >
      <div
        className={`selector-container ${
          showBitcoinCardOnly ? "disabled" : ""
        }`}
        onClick={() => !showBitcoinCardOnly && handleSelectPaymentMethod(false)}
      >
        {/* Icon */}
        <div
          className={`icon-container`}
          style={{
            backgroundColor:
              theme && darkModeType
                ? backgroundColor
                : Colors.constants[iconBackgroundColor],
          }}
        >
          <img src={`/icons/${icon}.png`} alt="icon" className="icon-image" />
        </div>

        {/* Text */}
        <div className="text-container">
          <div className="balance-title">
            {t(
              uiState === "CONTACT_REQUEST" || hideBalance
                ? `constants.${isBTC ? "bitcoin_upper" : "dollars_upper"}`
                : `constants.${isBTC ? "sat" : "usd"}_balance`,
            )}
          </div>

          {uiState !== "CONTACT_REQUEST" && !hideBalance && (
            <div
              className={`amount-text ${
                showHiddenBalance ? "hidden-balance" : ""
              }`}
            >
              {showHiddenBalance ? "A A A A A" : balance}
            </div>
          )}
        </div>

        {/* Chevron */}
        {!showBitcoinCardOnly && (
          <ThemeIcon
            colorOverride={
              theme && darkModeType
                ? Colors.light.text
                : Colors.constants.primary
            }
            size={20}
            iconName={"ChevronDown"}
          />
        )}
      </div>
    </div>
  );
}
