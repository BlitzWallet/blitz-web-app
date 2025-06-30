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
} from "../../constants";

export default function FormattedSatText({
  balance = 0,
  styles,
  reversed,
  frontText,
  containerStyles,
  isFailedPayment,
  neverHideBalance,
  globalBalanceDenomination,
  backText,
  useBalance,
}) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const localBalanceDenomination =
    globalBalanceDenomination || masterInfoObject.userBalanceDenomination;
  const currencyText = fiatStats.coin || "USD";
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
            )
          ),
    [balance, useBalance, localBalanceDenomination, fiatStats]
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

  // Hidding balance format
  if (!shouldShowAmount) {
    return (
      <div
        style={{
          ...containerStyles,
        }}
        className="formattedSatTextContainer"
      >
        {frontText && (
          <ThemeText textStyles={{ ...styles }} textContent={`${frontText}`} />
        )}
        <ThemeText
          reversed={reversed}
          textContent={HIDDEN_BALANCE_TEXT}
          textStyles={{ ...styles }}
        />
        {backText && (
          <ThemeText
            textStyles={{ ...styles, marginLeft: "5px" }}
            textContent={`${backText}`}
          />
        )}
      </div>
    );
  }

  // Bitcoin sats formatting
  if (showSats) {
    return (
      <div
        style={{
          ...containerStyles,
        }}
        className="formattedSatTextContainer"
      >
        {frontText && (
          <ThemeText textStyles={{ ...styles }} textContent={`${frontText}`} />
        )}
        {showSymbol && (
          <ThemeText
            textStyles={{ ...styles }}
            textContent={BITCOIN_SATS_ICON}
          />
        )}
        <ThemeText
          reversed={reversed}
          textContent={`${formattedBalance}`}
          textStyles={{ ...styles }}
        />
        {!showSymbol && (
          <ThemeText
            textStyles={{ ...styles, marginLeft: "5px" }}
            textContent={BITCOIN_SAT_TEXT}
          />
        )}
        {backText && (
          <ThemeText
            textStyles={{ ...styles, marginLeft: "5px" }}
            textContent={`${backText}`}
          />
        )}
      </div>
    );
  }

  // Fiat format
  return (
    <div
      style={{
        ...containerStyles,
      }}
      className="formattedSatTextContainer"
    >
      {frontText && (
        <ThemeText textStyles={{ ...styles }} textContent={`${frontText}`} />
      )}
      {isSymbolInFront && showSymbol && (
        <ThemeText textStyles={{ ...styles }} textContent={currencySymbol} />
      )}
      <ThemeText
        reversed={reversed}
        textContent={`${currencyOptions[1]}`}
        textStyles={{ ...styles }}
      />
      {!isSymbolInFront && showSymbol && (
        <ThemeText textStyles={{ ...styles }} textContent={currencySymbol} />
      )}
      {!showSymbol && (
        <ThemeText
          textStyles={{ ...styles, marginLeft: "5px" }}
          textContent={`${currencyText}`}
        />
      )}
      {backText && (
        <ThemeText
          textStyles={{ ...styles, marginLeft: "5px" }}
          textContent={`${backText}`}
        />
      )}
    </div>
  );
}
