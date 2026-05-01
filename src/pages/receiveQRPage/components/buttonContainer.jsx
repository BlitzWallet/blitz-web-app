import React from "react";
import { useOverlay } from "../../../contexts/overlayContext";
import "./buttonContainer.css";
import { useThemeContext } from "../../../contexts/themeContext";
import useThemeColors from "../../../hooks/useThemeColors";

export default function ReceiveButtonsContainer({
  receiveOption,
  initialSendAmount,
  description,
  endReceiveType,
}) {
  const { openOverlay } = useOverlay();
  const { textColor } = useThemeColors();

  return (
    <div className="receiveButtonContainer">
      <button
        className="switchNetworkButton"
        style={{ color: textColor }}
        onClick={() =>
          openOverlay({
            for: "halfModal",
            contentType: "switchReceiveOptions",
            params: {
              receiveOption,
              amount: initialSendAmount,
              description,
              endReceiveType,
              sliderHeight: "80dvh",
            },
          })
        }
      >
        Switch Network
      </button>
    </div>
  );
}
