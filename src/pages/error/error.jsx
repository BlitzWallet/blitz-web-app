import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ErrorScreen.css";
import { AnimatePresence, motion } from "framer-motion";
import { Colors } from "../../constants/theme";
import CustomButton from "../../components/customButton/customButton";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";

export default function ErrorScreen({ overlay, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true); // controls animation
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const errorMessage =
    overlay.errorMessage ||
    location?.state?.errorMessage ||
    "Something went wrong.";
  const navigateBack = location?.state?.navigateBack;

  const handleExitComplete = () => {
    if (onClose) {
      onClose();
      if (!overlay.navigateBack) return;
    }
    switch (navigateBack) {
      case "wallet":
        navigate("/wallet");
        break;
      case "homePage":
        navigate("/");
        break;
      default:
        navigate(-1);
    }
  };

  const handleOkClick = (e) => {
    e.stopPropagation();
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
            className="error-content"
            onClick={(e) => e.stopPropagation()}
          >
            <ThemeText className={"error-message"} textContent={errorMessage} />

            <div style={{ alignSelf: "center" }} onClick={handleOkClick}>
              <CustomButton
                buttonStyles={{
                  backgroundColor: theme ? backgroundColor : Colors.light.blue,
                }}
                textStyles={{
                  color: theme ? Colors.dark.text : Colors.dark.text,
                }}
                textContent={"OK"}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
