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
}) {
  const { textColor } = useThemeColors();
  const addPin = useCallback(
    (id) => {
      if (customFunction) {
        if (id === "back") {
          customFunction(null);
        } else if (id === "C") {
          setAmountValue("");
        } else {
          customFunction(String(id));
        }
        return;
      }

      if (id === "back") {
        setAmountValue((prev) => {
          return frompage === "sendingPage"
            ? String(prev / 1000).slice(0, String(prev / 1000).length - 1) *
                1000
            : String(prev).slice(0, String(prev).length - 1);
        });
      } else if (id === "C") {
        setAmountValue("");
      } else {
        setAmountValue((prev) => {
          let newNumber = "";

          if (frompage === "sendingPage") {
            newNumber = (String(prev / 1000) + id) * 1000;
          } else if (prev?.includes(".") && id === ".") newNumber = prev;
          else if (prev?.includes(".") && prev.split(".")[1].length > 1) {
            newNumber = prev;
          } else {
            newNumber = String(prev) + id;
          }

          if (usingForBalance) {
            const convertedValue =
              showDot || showDot === undefined
                ? (SATSPERBITCOIN / (fiatStats?.value || 65000)) * newNumber
                : newNumber;

            numberConverter(
              newNumber,
              showDot || showDot === undefined ? "fiat" : "sats",
              undefined,
              fiatStats,
            );
            const numberLength = integerPartLength(convertedValue);
            if (convertedValue > 25_000_000) return prev;
          }

          return newNumber;
        });
      }
    },
    [
      customFunction,
      frompage,
      setAmountValue,
      showDot,
      usingForBalance,
      fiatStats,
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
            onClick={() => addPin(num)}
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
