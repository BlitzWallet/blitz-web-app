const KEYBOARD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "back"];
import { useCallback } from "react";
import "./style.css";
import numberConverter from "../../functions/numberConverter";
import { SATSPERBITCOIN } from "../../constants";
import useThemeColors from "../../hooks/useThemeColors";
import { ChevronLeft, Dot } from "lucide-react";

function getKeyboardKeys(showDot) {
  return KEYBOARD_KEYS.map((key) => {
    return key;
  });
}
export default function CustomNumberKeyboard({
  setAmountValue,
  containerClassName,
  keyboardContianerClassName,
  keyClassName,
  frompage,
  showDot,
  usingForBalance,
  fiatStats,
  customFunction,
  useMaxBalance = true,
}) {
  const { textColor } = useThemeColors();

  const addPin = useCallback(
    (id) => {
      if (customFunction) {
        customFunction(id);
        return;
      }

      if (id === "back") {
        setAmountValue((prev) => {
          return String(prev).slice(0, -1);
        });
      } else if (id === "C") {
        setAmountValue("");
      } else {
        setAmountValue((prev) => {
          let previousNumber = typeof prev !== "string" ? String(prev) : prev;
          let newNumber = "";

          if (previousNumber?.includes(".") && id === ".") {
            newNumber = previousNumber;
          } else if (
            previousNumber?.includes(".") &&
            previousNumber.split(".")[1].length > 1
          ) {
            newNumber = previousNumber;
          } else {
            newNumber = String(previousNumber) + id;
          }

          // Add leading 0 if the number starts with a decimal point
          if (newNumber.startsWith(".")) {
            newNumber = "0" + newNumber;
          }

          // Remove leading zeros before digits (but keep single 0 before decimal)
          newNumber = newNumber.replace(/^(-?)0+(?=\d)/, "$1");

          if (usingForBalance) {
            const convertedValue =
              showDot || showDot === undefined
                ? (SATSPERBITCOIN / (fiatStats?.value || 65000)) * newNumber
                : newNumber;

            if (convertedValue > 25_000_000 && useMaxBalance)
              return previousNumber;
          }

          return newNumber;
        });
      }
    },
    [
      frompage,
      setAmountValue,
      showDot,
      usingForBalance,
      fiatStats,
      useMaxBalance,
      customFunction,
    ],
  );

  return (
    <div className={`keyboard-container ${keyboardContianerClassName}`}>
      <div className={`number-keyboard ${containerClassName}`}>
        {getKeyboardKeys(showDot).map((num) => (
          <button
            key={num}
            style={{ color: textColor }}
            className={`keyboard-key ${keyClassName}`}
            onClick={() => {
              if (num === "C" && showDot) {
                addPin(".");
              } else {
                addPin(num);
              }
            }}
          >
            {num === "back" ? (
              <ChevronLeft color={textColor} size={20} />
            ) : num === "C" && showDot ? (
              <Dot color={textColor} size={20} />
            ) : (
              num
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function integerPartLength(num) {
  const match = num.toString().match(/^(\d+)/);
  return match ? match[1].length : 0;
}
