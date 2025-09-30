import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./style.css";
import { AnimatePresence, motion } from "framer-motion";
import { Colors } from "../../constants/theme";
import CustomButton from "../../components/customButton/customButton";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";
import ThemeImage from "../../components/ThemeImage/themeImage";
import { xSmallIcon, xSmallIconWhite } from "../../constants/icons";

export default function InformationPopup({ overlay, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true); // controls animation
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const errorMessage = overlay.textContent || "Something went wrong.";

  const handleExitComplete = () => {
    onClose();
  };

  const handleOkClick = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setVisible(false);
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          onClick={(e) => handleOkClick(e)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: Colors.constants.halfModalBackground,
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: theme ? backgroundOffset : Colors.dark.text,
            }}
            className="contentContainer"
            onClick={(e) => e.stopPropagation()}
          >
            <ThemeImage
              clickFunction={handleOkClick}
              className="closeImage"
              lightModeIcon={xSmallIcon}
              darkModeIcon={xSmallIcon}
              lightsOutIcon={xSmallIconWhite}
            />
            <ThemeText className={"message"} textContent={errorMessage} />

            <div style={{ alignSelf: "center" }} onClick={handleOkClick}>
              <CustomButton
                buttonStyles={{
                  backgroundColor: theme ? backgroundColor : Colors.light.blue,
                }}
                textStyles={{
                  color: theme ? Colors.dark.text : Colors.dark.text,
                }}
                textContent={overlay.buttonText}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
