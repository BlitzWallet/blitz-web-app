import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import Lottie from "react-lottie-player";
import confirmTxAnimation from "../../../../../assets/confirmTxAnimation.json";
import { updateConfirmAnimation } from "../../../../../functions/lottieViewColorTransformer";
import ThemeText from "../../../../../components/themeText/themeText";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useToast } from "../../../../../contexts/toastManager";
import "../style.css";

export default function ConfirmReceivePayment() {
  const location = useLocation();
  const props = location.state || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset } = useThemeColors();
  const { showToast } = useToast();
  const animationRef = useRef(null);

  const didSucceed = props.didSucceed;
  const isRefund = props.isRefund;
  const number = props.number;

  const phoneNumber = useMemo(() => {
    if (!number) return "";
    const cleaned = String(number).replace(/\D/g, "");
    return cleaned.length > 0 ? `+${cleaned}` : String(number);
  }, [number]);

  const confirmAnimation = useMemo(() => {
    return updateConfirmAnimation(
      confirmTxAnimation,
      theme ? (darkModeType ? "lightsOut" : "dark") : "light"
    );
  }, [theme, darkModeType]);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const handleCopyPhone = useCallback(() => {
    if (!number) return;
    try {
      navigator.clipboard.writeText(String(number));
      showToast({ message: "Copied!", type: "success" });
    } catch {
      showToast({ message: "Copied!", type: "success" });
    }
  }, [number, showToast]);

  return (
    <div
      className="sms4sats-confirm-overlay"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="sms4sats-confirm-card"
        style={{ backgroundColor: backgroundOffset }}
      >
        <button
          className="sms4sats-confirm-close"
          onClick={() => navigate(-1)}
        >
          <X color={textColor} size={22} />
        </button>

        <div className="sms4sats-confirm-animation">
          <Lottie
            ref={animationRef}
            animationData={confirmAnimation}
            play
            loop={false}
            style={{ width: 150, height: 150 }}
          />
        </div>

        <div
          style={{
            width: isRefund ? "90%" : "100%",
            margin: "0 auto",
          }}
        >
          <ThemeText
            textContent={
              isRefund
                ? didSucceed
                  ? t("apps.sms4sats.confirmCodePage.automaticRefund")
                  : t("apps.sms4sats.confirmCodePage.waitedRefund")
                : t("apps.sms4sats.confirmCodePage.header")
            }
            textStyles={{
              textAlign: "center",
              marginBottom: 20,
            }}
          />

          {!isRefund && (
            <>
              <ThemeText
                textContent={t(
                  "apps.sms4sats.confirmCodePage.phoneNumberLabel"
                )}
                textStyles={{
                  textAlign: "center",
                  opacity: 0.7,
                  marginBottom: 4,
                }}
              />

              <div onClick={handleCopyPhone} style={{ cursor: "pointer" }}>
                <ThemeText
                  textContent={phoneNumber}
                  textStyles={{
                    fontSize: "1.6rem",
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                />
              </div>

              <div className="sms4sats-instruction-step">
                <ThemeText
                  textContent={t("apps.sms4sats.confirmCodePage.step1")}
                />
              </div>
              <div className="sms4sats-instruction-step">
                <ThemeText
                  textContent={t("apps.sms4sats.confirmCodePage.step2")}
                />
              </div>
              <div className="sms4sats-instruction-step">
                <ThemeText
                  textContent={t("apps.sms4sats.confirmCodePage.step3")}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
