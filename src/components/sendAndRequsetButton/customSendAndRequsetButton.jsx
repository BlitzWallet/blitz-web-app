import { ArrowDown, ArrowUp } from "lucide-react";
import "./customSendAndRequestBTN.css";

import { useThemeContext } from "../../contexts/themeContext";
import { Colors } from "../../constants/theme";

export default function CustomSendAndRequsetBTN({
  btnType,
  btnFunction,
  arrowColor,
  containerBackgroundColor,
  height = 40,
  width = 40,
  containerStyles,
  activeOpacity = 0.2,
}) {
  const { theme, darkModeType } = useThemeContext();
  return (
    <button
      className="send-request-button"
      style={{
        opacity: activeOpacity === 1 ? 1 : undefined,
      }}
      key={btnType}
      onClick={() => {
        btnFunction();
      }}
    >
      <div
        className="scan-qr-icon"
        style={{
          backgroundColor: containerBackgroundColor,
          ...containerStyles,
        }}
      >
        {btnType === "send" ? (
          <ArrowUp
            color={
              theme && darkModeType ? Colors.light.text : Colors.constants.blue
            }
            size={width}
          />
        ) : (
          <ArrowDown
            color={
              theme && darkModeType ? Colors.light.text : Colors.constants.blue
            }
            size={width}
          />
        )}
      </div>
    </button>
  );
}
