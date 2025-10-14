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
}) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();

  const localBalanceDenomination =
    globalBalanceDenomination || masterInfoObject.userBalanceDenomination;
  const currencyText = (fiatStats.coin || "USD").toUpperCase();

  const formattedBalance = useMemo(
    () =>
      useBalance
        ? balance
        : formatBalanceAmount(
            numberConverter(
              balance,
              localBalanceDenomination,
              localBalanceDenomination === "fiat" ? 2 : 0,
              fiatStats
            ),
            useMillionDenomination
          ),
    [
      balance,
      useBalance,
      localBalanceDenomination,
      fiatStats,
      useMillionDenomination,
    ]
  );

  const currencyOptions = useMemo(
    () =>
      formatCurrency({
        amount: formattedBalance,
        code: currencyText,
      }),
    [formattedBalance, currencyText]
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
      textStyles={{ includeFontPadding: false, ...styles, ...extra }}
      textContent={content}
    />
  );

  let children = [];

  // Hidden balance format
  if (!shouldShowAmount) {
    children = [
      frontText && renderText(frontText),
      renderText(HIDDEN_BALANCE_TEXT),
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
        { marginLeft: 5 }
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
