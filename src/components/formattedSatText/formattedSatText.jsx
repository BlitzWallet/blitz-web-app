import { useMemo } from "react";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import formatBalanceAmount from "../../functions/formatNumber";
import numberConverter from "../../functions/numberConverter";
import { formatCurrency } from "../../functions/formatCurrency";
import "./style.css";
import ThemeText from "../themeText/themeText";
import {
  BITCOIN_SAT_TEXT,
  BITCOIN_SATS_ICON,
  CUSTOM_TOKEN_CURRENCY_OPTIONS,
  HIDDEN_BALANCE_TEXT,
  TOKEN_TICKER_MAX_LENGTH,
} from "../../constants";

export default function FormattedSatText({
  balance = 0,
  styles,
  reversed,
  frontText,
  containerStyles,
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
}) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats: globalFiatStats } = useNodeContext();

  const showCustomCurrencyLabel = CUSTOM_TOKEN_CURRENCY_OPTIONS.find(
    (item) => item.token === customLabel,
  );

  const fiatStats = forceFiatStats || globalFiatStats;

  const localBalanceDenomination =
    globalBalanceDenomination || masterInfoObject.userBalanceDenomination;
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
          ),
    [
      balance,
      useBalance,
      localBalanceDenomination,
      fiatStats,
      useMillionDenomination,
    ],
  );

  const currencyOptions = useMemo(
    () =>
      formatCurrency({
        amount: formattedBalance,
        code: currencyText,
      }),
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

  // Hidden balance format
  if (!shouldShowAmount) {
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
  }
  // Custom label format
  else if (useCustomLabel) {
    children = [
      frontText && renderText(frontText),
      renderText(formatBalanceAmount(balance, useMillionDenomination)),
      renderText(
        ` ${customLabel?.toUpperCase()?.slice(0, TOKEN_TICKER_MAX_LENGTH)}`,
        { marginLeft: 5 },
      ),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
  }
  // Bitcoin sats format
  else if (showSats) {
    children = [
      frontText && renderText(frontText),
      showSymbol && renderText(BITCOIN_SATS_ICON),
      renderText(formattedBalance),
      !showSymbol && renderText(BITCOIN_SAT_TEXT, { marginLeft: 5 }),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
  }
  // Fiat format
  else {
    children = [
      frontText && renderText(frontText),
      isSymbolInFront && showSymbol && renderText(currencySymbol),
      renderText(currencyOptions[1]),
      !isSymbolInFront && showSymbol && renderText(currencySymbol),
      !showSymbol && renderText(currencyText, { marginLeft: 5 }),
      backText && renderText(backText, { marginLeft: 5 }),
    ];
  }

  return (
    <div className="formattedSatTextContainer" style={{ ...containerStyles }}>
      {children.filter(Boolean)}
    </div>
  );
}
