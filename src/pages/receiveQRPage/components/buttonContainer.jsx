import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import copyToClipboard from "../../../functions/copyToClipboard";
import "./buttonContainer.css";
import CustomButton from "../../../components/customButton/customButton";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import { useOverlay } from "../../../contexts/overlayContext";

export default function ReceiveButtonsContainer({
  generatingInvoiceQRCode,
  generatedAddress,
  receiveOption,
  initialSendAmount,
  description,
}) {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, darkModeType } = useThemeContext();
  const { textColor } = useThemeColors();

  return (
    <div className="receiveButtonContainer">
      <CustomButton
        actionFunction={() =>
          navigate(`/receiveAmount`, {
            state: {
              receiveOption,
              from: "receivePage",
            },
          })
        }
        textContent={"Amount"}
      />
      <CustomButton
        buttonStyles={{ opacity: generatingInvoiceQRCode ? 0.5 : 1 }}
        actionFunction={() => {
          if (!generatedAddress) return;
          copyToClipboard(generatedAddress, openOverlay, location);
        }}
        textContent={"Copy"}
      />

      <CustomButton
        actionFunction={() => {
          openOverlay({
            for: "halfModal",
            contentType: "switchReceiveOptions",

            params: {
              receiveOption,
              amount: initialSendAmount,
              description: description,
              sliderHeight: "80dvh",
            },
          });
        }}
        buttonStyles={{
          backgroundColor: "transparent",
          borderColor: theme ? Colors.dark.text : Colors.light.text,
        }}
        textStyles={{ color: textColor }}
        textContent={"Choose Network"}
      />
    </div>
  );
}
