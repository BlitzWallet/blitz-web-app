import { Clipboard, HelpCircle } from "lucide-react";
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Colors } from "../constants/theme";
import "./toastManager.css";
import ThemeText from "../components/themeText/themeText";
import { useTranslation } from "react-i18next";
import displayCorrectDenomination from "../functions/displayCorrectDenomination";
import { useSpark } from "./sparkContext";
import { useNodeContext } from "./nodeContext";
import { useGlobalContextProvider } from "./masterInfoObject";

// Toast Context
const ToastContext = createContext();

const initialState = {
  toasts: [],
};

const toastReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload),
      };
    case "CLEAR_TOASTS":
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  const showToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const toastWithId = {
      id,
      type: "success",
      duration: 3000,
      position: "top",
      ...toast,
    };

    dispatch({ type: "ADD_TOAST", payload: toastWithId });

    if (toastWithId.duration > 0) {
      setTimeout(() => {
        dispatch({ type: "REMOVE_TOAST", payload: id });
      }, toastWithId.duration);
    }

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    dispatch({ type: "REMOVE_TOAST", payload: id });
  }, []);

  const clearToasts = useCallback(() => {
    dispatch({ type: "CLEAR_TOASTS" });
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        showToast,
        hideToast,
        clearToasts,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Individual Toast Component
const Toast = ({
  toast,
  onHide,
  fiatStats,
  sparkInformation,
  masterInfoObject,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const toastRef = useRef(null);
  const startY = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleAnimateOut = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onHide();
    }, 300);
  }, [onHide]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startY.current = e.clientY;
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentY = e.clientY;
    const diff = currentY - startY.current;
    if (diff < 0) {
      setDragY(diff);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff < 0) {
      setDragY(diff);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragY < -20) {
      handleAnimateOut();
    } else {
      setDragY(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleDragEnd);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, dragY]);

  const getToastClass = () => {
    const classes = ["toast"];
    switch (toast.type) {
      case "clipboard":
        classes.push("toast-clipboard");
        break;
      case "confirmTx":
        classes.push("toast-clipboard");
        break;
      case "error":
        classes.push("toast-error");
        break;
      case "warning":
        classes.push("toast-warning");
        break;
      case "info":
        classes.push("toast-info");
        break;
      default:
        classes.push("toast-default");
    }
    if (isVisible) classes.push("toast-visible");
    return classes.join(" ");
  };

  const getIconForType = () => {
    switch (toast.type) {
      case "clipboard":
        return "📋";
      case "confirmTx":
        return "ℹ️";
      case "error":
        return "✕";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      case "success":
        return "✓";
      default:
        return "•";
    }
  };
  const token = toast.isLRC20Payment
    ? sparkInformation.tokens?.[toast?.LRC20Token]
    : "";

  const formattedTokensBalance =
    toast.type === "confirmTx" && !!token
      ? formatTokensNumber(toast.amount, token?.tokenMetadata?.decimals)
      : 0;

  const toastStyle = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? "none" : "transform 0.3s ease",
  };

  return (
    <div
      ref={toastRef}
      className={getToastClass()}
      style={toastStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="toast-content">
        {toast.type === "clipboard" ? (
          <Clipboard color={Colors.light.text} />
        ) : toast.type === "confirmTx" ? (
          <HelpCircle color={Colors.light.text} />
        ) : (
          <ThemeText styles={styles.toastIcon} content={getIconForType()} />
        )}
        <div className="toast-text">
          {toast.type === "confirmTx" ? (
            <>
              <ThemeText
                CustomNumberOfLines={1}
                textStyles={{ fontWeight: 500 }}
                className={"toast-message"}
                textContent={t("pushNotifications.paymentReceived.title")}
              />
              <ThemeText
                CustomNumberOfLines={1}
                className={"toast-message"}
                textContent={t("pushNotifications.paymentReceived.body", {
                  totalAmount: displayCorrectDenomination({
                    amount: !!token ? formattedTokensBalance : toast.amount,
                    masterInfoObject,
                    fiatStats,
                    useCustomLabel: !!token,
                    customLabel: token?.tokenMetadata?.tokenTicker,
                    useMillionDenomination: true,
                  }),
                })}
              />
            </>
          ) : (
            <ThemeText
              className={"toast-message"}
              CustomNumberOfLines={1}
              textContent={t(toast.title)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
export const ToastContainer = () => {
  const { toasts, hideToast } = useToast();
  const { sparkInformation } = useSpark();
  const { fiatStats } = useNodeContext();
  const { masterInfoObject } = useGlobalContextProvider();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onHide={() => hideToast(toast.id)}
          sparkInformation={sparkInformation}
          fiatStats={fiatStats}
          masterInfoObject={masterInfoObject}
        />
      ))}
    </div>
  );
};
