const KEYBOARD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "back"];
import { useCallback } from "react";
import "./style.css";
import numberConverter from "../../functions/numberConverter";
import { SATSPERBITCOIN } from "../../constants";
import { leftCheveronDark } from "../../constants/icons";
import ThemeImage from "../ThemeImage/themeImage";
import useThemeColors from "../../hooks/useThemeColors";

function getKeyboardKeys(showDot) {
  return KEYBOARD_KEYS.map((key) => {
    if (key === "C" && showDot) return ".";
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
}) {
  const { textColor } = useThemeColors();
  // const {theme,darkModeType}=usethemec
  const addPin = useCallback(
    (id) => {
      console.log(id);
      if (id === "back") {
        setAmountValue((prev) => {
          return frompage === "sendingPage"
            ? String(prev / 1000).slice(0, String(prev / 1000).length - 1) *
                1000
            : String(prev).slice(0, String(prev).length - 1);
        });
        // } else setAmountValue(0);
      } else if (id === "C") {
        setAmountValue("");
      } else {
        setAmountValue((prev) => {
          let newNumber = "";

          if (frompage === "sendingPage") {
            newNumber = (String(prev / 1000) + id) * 1000;
          } else if (prev?.includes(".") && id === ".")
            newNumber = prev; //making sure only one decimal is in number
          else if (prev?.includes(".") && prev.split(".")[1].length > 1) {
            //controling length to max 2 digits after decimal
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
              fiatStats
            );
            console.log(fiatStats?.value);
            console.log(convertedValue, "CONVERTED VAL");
            const numberLength = integerPartLength(convertedValue);
            console.log(numberLength, "NUMBER LENGTH");
            if (convertedValue > 25_000_000) return prev;
          }

          return newNumber;
        });
      }
    },
    [frompage, setAmountValue, showDot, usingForBalance, fiatStats]
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
              <ThemeImage
                styles={{ width: 20, height: 20 }}
                icon={leftCheveronDark}
              />
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
