import { useMemo, useState, useRef, useEffect } from "react";
import {
  BITCOIN_SAT_TEXT,
  BITCOIN_SATS_ICON,
  HIDDEN_OPACITY,
} from "../../constants";
import "./formattedBalanceInput.css";
import { useNodeContext } from "../../contexts/nodeContext";
import { formatCurrency } from "../../functions/formatCurrency";
import ThemeText from "../themeText/themeText";
import formatBalanceAmount from "../../functions/formatNumber";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import useThemeColors from "../../hooks/useThemeColors";

export default function FormattedBalanceInput({
  amountValue = 0,
  containerFunction,
  inputDenomination,
  customTextInputContainerStyles,
  customTextInputStyles,
  activeOpacity = 0.2,
  maxWidth = 0.95,
  customCurrencyCode = "",
}) {
  const containerRef = useRef(null);
  const amountRef = useRef(null);
  const labelRef = useRef(null);

  const { masterInfoObject } = useGlobalContextProvider();
  const { textColor } = useThemeColors();
  const { fiatStats } = useNodeContext();

  const currencyText = fiatStats.coin || "USD";
  const showSymbol = masterInfoObject.satDisplay !== "word";

  const formattedAmount = formatBalanceAmount(
    amountValue,
    false,
    masterInfoObject
  );

  const currencyInfo = useMemo(
    () => formatCurrency({ amount: 0, code: currencyText }),
    [currencyText]
  );

  const isSymbolInFront = currencyInfo[3];
  const currencySymbol = currencyInfo[2];

  const showSats =
    inputDenomination === "sats" || inputDenomination === "hidden";

  const displayText = useMemo(() => {
    if (customCurrencyCode) return formattedAmount;
    return formattedAmount;
  }, [formattedAmount, customCurrencyCode]);

  const fontSize = useAutoScaleCompositeFont({
    containerRef,
    amountRef,
    labelRef,
    baseFontSize: 40,
    minFontSize: 24,
    padding: 12,
    displayText,
  });

  return (
    <div
      ref={containerRef}
      onClick={containerFunction}
      className="formatted-balance-input-container"
      style={{
        opacity: !amountValue ? HIDDEN_OPACITY : 1,
        maxWidth: `${maxWidth * 100}%`,
        ...customTextInputContainerStyles,
      }}
    >
      {isSymbolInFront && !showSats && showSymbol && (
        <ThemeText
          ref={labelRef}
          textStyles={{ fontSize, color: textColor }}
          textContent={currencySymbol}
        />
      )}

      {showSats && showSymbol && (
        <ThemeText
          ref={labelRef}
          textStyles={{ fontSize, color: textColor }}
          textContent={BITCOIN_SATS_ICON}
        />
      )}

      <ThemeText
        ref={amountRef}
        textStyles={{
          fontSize,
          color: textColor,
          whiteSpace: "nowrap",
          marginRight: 5,
          ...customTextInputStyles,
        }}
        textContent={formattedAmount}
      />

      {!isSymbolInFront && !showSats && showSymbol && (
        <ThemeText
          ref={labelRef}
          textStyles={{ fontSize, color: textColor }}
          textContent={currencySymbol}
        />
      )}

      {!showSymbol && !showSats && (
        <ThemeText
          ref={labelRef}
          textStyles={{ fontSize, color: textColor }}
          textContent={currencyText}
        />
      )}

      {!showSymbol && showSats && (
        <ThemeText
          ref={labelRef}
          textStyles={{ fontSize, color: textColor }}
          textContent={BITCOIN_SAT_TEXT}
        />
      )}
    </div>
  );
}
function useAutoScaleCompositeFont({
  containerRef,
  amountRef,
  labelRef,
  baseFontSize = 40,
  minFontSize = 24,
  padding = 16,
  displayText,
}) {
  const [fontSize, setFontSize] = useState(baseFontSize);

  useEffect(() => {
    const container = containerRef.current;
    const amountEl = amountRef.current;
    const labelEl = labelRef.current;

    if (!container || !amountEl) return;

    const containerWidth = container.offsetWidth;
    if (!containerWidth) return;

    // Force base size for measurement
    amountEl.style.fontSize = baseFontSize + "px";
    if (labelEl) labelEl.style.fontSize = baseFontSize + "px";

    const amountWidth = amountEl.offsetWidth;
    const labelWidth = labelEl ? labelEl.offsetWidth : 0;

    const totalWidth = amountWidth + labelWidth;

    const available = containerWidth - padding * 2;

    let nextSize = baseFontSize;

    if (totalWidth > available) {
      const ratio = available / totalWidth;
      nextSize = Math.max(minFontSize, Math.floor(baseFontSize * ratio));
    }

    setFontSize(nextSize);
  }, [
    containerRef,
    amountRef,
    labelRef,
    baseFontSize,
    minFontSize,
    padding,
    displayText,
  ]);

  return fontSize;
}
