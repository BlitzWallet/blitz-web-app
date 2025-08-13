import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import copyToClipboard from "../../../functions/copyToClipboard";
import "./buttonContainer.css";
import CustomButton from "../../../components/customButton/customButton";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";

export default function ReceiveButtonsContainer({
  generatingInvoiceQRCode,
  generatedAddress,
  receiveOption,
  initialSendAmount,
  description,
}) {
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
          copyToClipboard(generatedAddress, navigate, location);
        }}
        textContent={"Copy"}
      />

      <CustomButton
        actionFunction={() =>
          navigate(`/receive-options`, {
            state: {
              receiveOption,
              amount: initialSendAmount,
              description: description,
            },
          })
        }
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
