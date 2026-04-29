import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useTranslation } from "react-i18next";
import "./ErrorScreen.css";

export default function ErrorScreen({ overlay, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { t } = useTranslation();

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
          onClick={handleOkClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="error-backdrop"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={`error-card error-card--light`}
          >
            {/* Message */}
            <div className="error-message-wrap">
              <p className="error-message">{errorMessage}</p>
            </div>

            {/* Divider */}
            <div className="error-divider" />

            {/* OK Button */}
            <button
              className="error-ok-btn"
              onClick={handleOkClick}
              style={{
                color:
                  theme && darkModeType
                    ? Colors.light.text
                    : Colors.constants.blue,
              }}
            >
              {t("constants.back")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
