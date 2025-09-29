import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./style.css";
import { AnimatePresence, motion } from "framer-motion";

import { Colors } from "../../constants/theme";
import CustomButton from "../customButton/customButton";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../themeText/themeText";

export default function ConfirmActionPage({ overlay, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true); // controls animation

  const { theme } = useThemeContext();
  const { backgroundOffset } = useThemeColors();

  console.log(onClose);
  const {
    confirmHeader,
    confirmDescription: confirmMessage,
    fromRoute,
    navigateBack,
    customProps,
    useCustomProps,
    useProps,
  } = overlay || location.state;

  const handleExitComplete = () => {
    console.log("running here");
    if (onClose) {
      console.log("CLOSING");
      onClose();
    }

    switch (navigateBack) {
      case "wallet":
        navigate("/wallet");
        break;
      case "homePage":
        navigate("/");
        break;
      case "settings-item":
        navigate("/settings-item", {
          state: {
            for: "backup wallet",
          },
          replace: true,
        });
        break;
      default:
        navigate(-1);
    }
  };

  const handleOkClick = (e) => {
    if (e) e.stopPropagation();
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
            className="confirm-action-content"
            onClick={(e) => e.stopPropagation()}
          >
            <ThemeText
              className="confirm-action-header"
              textContent={confirmHeader}
            />
            <ThemeText
              className="confirm-action-message"
              textContent={confirmMessage}
            />

            <div
              className="confirm-action-button-container"
              style={{ alignSelf: "center" }}
            >
              <CustomButton
                actionFunction={() => {
                  if (onClose) {
                    onClose();
                  }
                  if (fromRoute) {
                    if (useProps) {
                      navigate(
                        `/${fromRoute}`,
                        useCustomProps
                          ? { state: customProps, replace: true }
                          : { state: { confirmed: true }, replace: true }
                      );
                    } else {
                      navigate(`/${fromRoute}?confirmed=true`);
                    }
                    return;
                  }
                  handleOkClick();
                }}
                buttonStyles={{
                  backgroundColor: theme ? Colors.dark.text : Colors.light.blue,
                  flex: 1,
                  margin: 5,
                }}
                textStyles={{
                  color: theme ? Colors.light.text : Colors.dark.text,
                }}
                textContent={"Yes"}
              />
              <CustomButton
                actionFunction={handleOkClick}
                buttonStyles={{
                  backgroundColor: theme ? Colors.dark.text : Colors.light.blue,
                  flex: 1,
                  margin: 5,
                }}
                textStyles={{
                  color: theme ? Colors.light.text : Colors.dark.text,
                }}
                textContent={"No"}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
