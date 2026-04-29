import ThemeIcon from "../../../components/themeIcon";
import ThemeText from "../../../components/themeText/themeText";
import { Colors } from "../../../constants/theme";
import { useSpark } from "../../../contexts/sparkContext";
import displayCorrectDenomination from "../../../functions/displayCorrectDenomination";
import { formatTokensNumber } from "../../../functions/lrc20/formatTokensBalance";
import useThemeColors from "../../../hooks/useThemeColors";
import "./chooseLRC20TokenContainer.css";

export default function ChooseLRC20TokenContainer({
  theme,
  darkModeType,
  handleSelectPaymentMethod,
  bitcoinBalance,
  masterInfoObject,
  fiatStats,
  uiState,
  t,
  seletctedToken,
  selectedLRC20Asset,
  containerStyles = {},
}) {
  const { tokensImageCache } = useSpark();
  const { backgroundColor } = useThemeColors();

  const imageUri = tokensImageCache?.[selectedLRC20Asset];
  const isBitcoin = selectedLRC20Asset === "Bitcoin";

  const balance = isBitcoin
    ? displayCorrectDenomination({
        amount: bitcoinBalance,
        masterInfoObject: {
          ...masterInfoObject,
          userBalanceDenomination: "sats",
        },
        fiatStats,
      })
    : displayCorrectDenomination({
        amount: formatTokensNumber(
          seletctedToken?.balance,
          seletctedToken?.tokenMetadata?.decimals,
        ),
        masterInfoObject,
        useCustomLabel: true,
        customLabel: seletctedToken?.tokenMetadata?.tokenTicker,
        fiatStats,
      });

  return (
    <div className="choose-token-container" style={containerStyles}>
      <button
        type="button"
        className="choose-token-selector"
        onClick={handleSelectPaymentMethod}
      >
        <div
          className="choose-token-icon"
          style={{
            backgroundColor:
              theme && darkModeType
                ? backgroundColor
                : isBitcoin
                  ? Colors.constants.bitcoinOrange
                  : Colors.constants.blue,
          }}
        >
          {isBitcoin ? (
            <img
              style={{ width: 25, height: 25 }}
              src="/icons/bitcoinIcon.png"
              alt="Bitcoin"
            />
          ) : imageUri ? (
            <img src={imageUri} alt={selectedLRC20Asset} />
          ) : (
            <ThemeIcon
              colorOverride={Colors.dark.text}
              size={20}
              iconName="Coins"
            />
          )}
        </div>

        <div className="choose-token-copy">
          <div className="choose-token-title">
            {`${seletctedToken?.tokenMetadata?.tokenTicker || "Bitcoin"} ${t("constants.balance")}`}
          </div>
          {uiState !== "CONTACT_REQUEST" && (
            <ThemeText
              textStyles={{ color: Colors.light.text }}
              className="choose-token-balance"
              textContent={String(balance)}
            />
          )}
        </div>

        <ThemeIcon
          colorOverride={
            theme && darkModeType ? Colors.light.text : Colors.constants.primary
          }
          size={20}
          iconName="ChevronDown"
        />
      </button>
    </div>
  );
}
