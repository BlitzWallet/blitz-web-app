import { useMemo } from "react";
import {
  BITCOIN_SAT_TEXT,
  BITCOIN_SATS_ICON,
  HIDDEN_BALANCE_TEXT,
} from "../../constants";
import formatBalanceAmount from "../../functions/formatNumber";
import numberConverter from "../../functions/numberConverter";
import { formatCurrency } from "../../functions/formatCurrency";
import formatTokensLabel from "../../functions/lrc20/formatTokensLabel";
import truncateToTwoDecimals from "../../functions/truncateNumber";
import ThemeText from "../themeText/themeText";

export default function FormattedSatText({
  balance = 0,
  styles = {},
  reversed,
  frontText,
  containerStyles = {},
  neverHideBalance,
  globalBalanceDenomination,
  backText,
  useBalance,
  useCustomLabel = false,
  customLabel = "",
  useMillionDenomination = false,
  useSpaces = true,
  useSizing = false,
  forceCurrency = null,
  forceFiatStats = null,
  autoAdjustFontSize = false,
  masterInfoObject = {},
  fiatStats: propFiatStats,
  CUSTOM_TOKEN_CURRENCY_OPTIONS = [],
}) {
  const fiatStats = forceFiatStats || propFiatStats || {};
  const localBalanceDenomination =
    globalBalanceDenomination ||
    masterInfoObject.userBalanceDenomination ||
    "sats";

  const showCustomCurrencyLabel = CUSTOM_TOKEN_CURRENCY_OPTIONS.find(
    (item) => item.token === customLabel,
  );

  const currencyText = forceCurrency
    ? forceCurrency
    : showCustomCurrencyLabel
      ? showCustomCurrencyLabel.currency
      : masterInfoObject.fiatCurrency || "USD";

  const formattedBalance = useMemo(
    () =>
      useBalance
        ? balance
        : formatBalanceAmount(
            numberConverter(
              balance,
              localBalanceDenomination,
              localBalanceDenomination === "fiat" ? 2 : 0,
              fiatStats,
            ),
            useMillionDenomination,
            masterInfoObject,
          ),
    [
      balance,
      useBalance,
      localBalanceDenomination,
      fiatStats,
      useMillionDenomination,
      masterInfoObject.thousandsSeperator,
      masterInfoObject.userSelectedLanguage,
    ],
  );

  const currencyOptions = useMemo(
    () => formatCurrency({ amount: formattedBalance, code: currencyText }),
    [formattedBalance, currencyText],
  );

  const isSymbolInFront = currencyOptions[3];
  const currencySymbol = currencyOptions[2];
  const showSymbol = masterInfoObject.satDisplay === "symbol";
  const showSats =
    localBalanceDenomination === "sats" ||
    localBalanceDenomination === "hidden";
  const shouldShowAmount =
    neverHideBalance ||
    localBalanceDenomination === "sats" ||
    localBalanceDenomination === "fiat";

  const renderText = (content, extra = {}) => (
    <ThemeText
      key={content}
      reversed={reversed}
      textStyles={{ ...styles, ...extra }}
      textContent={content}
    />
  );
  const hiddenText = (content, key, extra = {}) => (
    <ThemeText
      key={key}
      reversed={reversed}
      textStyles={{
        ...styles,
        ...extra,
        fontFamily: "Blitzicons1",
      }}
      textContent={content}
    />
  );

  let children = [];

  if (!shouldShowAmount) {
    const base = styles?.fontSize || 20;
    children = [
      frontText && renderText(frontText),
      hiddenText(HIDDEN_BALANCE_TEXT, 1, {
        fontSize: styles?.fontSize
          ? `calc(${styles.fontSize} * ${useSizing ? 0.8 : 1})`
          : `calc(1em * ${useSizing ? 0.8 : 0.65})`,
        margin: "0 2px",
      }),
      hiddenText(HIDDEN_BALANCE_TEXT, 2, {
        fontSize: styles?.fontSize
          ? `calc(${styles.fontSize} * ${useSizing ? 0.9 : 1})`
          : `calc(1em * ${useSizing ? 0.9 : 0.65})`,
        margin: "0 2px",
      }),
      hiddenText(HIDDEN_BALANCE_TEXT, 3, {
        fontSize: styles?.fontSize
          ? `calc(${styles.fontSize} * ${useSizing ? 1 : 1})`
          : `calc(1em * ${useSizing ? 1 : 0.65})`,
        margin: "0 2px",
      }),
      hiddenText(HIDDEN_BALANCE_TEXT, 4, {
        fontSize: styles?.fontSize
          ? `calc(${styles.fontSize} * ${useSizing ? 0.9 : 1})`
          : `calc(1em * ${useSizing ? 0.9 : 0.65})`,
        margin: "0 2px",
      }),
      hiddenText(HIDDEN_BALANCE_TEXT, 5, {
        fontSize: styles?.fontSize
          ? `calc(${styles.fontSize} * ${useSizing ? 0.8 : 1})`
          : `calc(1em * ${useSizing ? 0.8 : 0.65})`,
        margin: "0 2px",
      }),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
  } else if (useCustomLabel) {
    if (showCustomCurrencyLabel) {
      children = [
        frontText && renderText(frontText),
        renderText(
          `${isSymbolInFront && showSymbol ? currencySymbol : ""}${formatBalanceAmount(
            truncateToTwoDecimals(balance),
            true,
            masterInfoObject,
          )}${!isSymbolInFront && showSymbol ? currencySymbol : ""}${
            !showSymbol ? " " + currencyText : ""
          }`,
        ),
        backText && renderText(backText, { marginLeft: 5 }),
      ];
    } else {
      children = [
        frontText && renderText(frontText, { marginLeft: "auto" }),
        renderText(
          formatBalanceAmount(
            balance,
            useMillionDenomination,
            masterInfoObject,
          ),
          { marginLeft: frontText ? 0 : "auto" },
        ),
        renderText(` ${formatTokensLabel(customLabel)}`, { flexShrink: 1 }),
        backText && renderText(backText, { marginLeft: 5 }),
      ];
    }
  } else if (showSats) {
    children = [
      frontText && renderText(frontText),
      renderText(
        `${showSymbol ? BITCOIN_SATS_ICON : ""}${formattedBalance}${
          !showSymbol ? " " + BITCOIN_SAT_TEXT : ""
        }`,
      ),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
    // Custom label format
  } else {
    children = [
      frontText && renderText(frontText),
      renderText(
        `${isSymbolInFront && showSymbol ? currencySymbol : ""}${currencyOptions[1]}${
          !isSymbolInFront && showSymbol ? currencySymbol : ""
        }${!showSymbol ? " " + currencyText : ""}`,
      ),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
  }

  return (
    <div
      style={{
        alignItems: "center",
        justifyContent: "center",
        display: "flex",
        flexDirection: "row",
        flexShrink: 1,
        paddingLeft: 5,
        paddingRight: 5,
        ...containerStyles,
      }}
    >
      {children.filter(Boolean)}
    </div>
  );
}
