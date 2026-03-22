import { useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import ThemeText from "../../../../../components/themeText/themeText";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useToast } from "../../../../../contexts/toastManager";
import "../style.css";

export default function ViewSMSCode() {
  const location = useLocation();
  const props = location.state || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor, backgroundOffset } = useThemeColors();
  const { showToast } = useToast();

  const country = props.country || "N/A";
  const code = props.code || "N/A";
  const phone = props.phone || "";

  const phoneNumber = useMemo(() => {
    if (!phone) return "";
    const cleaned = String(phone).replace(/\D/g, "");
    return cleaned.length > 0 ? `+${cleaned}` : String(phone);
  }, [phone]);

  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(code);
      showToast({ message: "Copied!", type: "success" });
    } catch {
      showToast({ message: "Copied!", type: "success" });
    }
  }, [code, showToast]);

  return (
    <div className="sms4sats-code-overlay">
      <div
        className="sms4sats-code-card"
        style={{ backgroundColor: backgroundOffset }}
      >
        <div className="sms4sats-code-topbar">
          <ThemeText
            textContent={t("apps.sms4sats.viewSMSReceiveCode.header")}
            textStyles={{
              textAlign: "center",
              fontSize: "1.1rem",
              fontWeight: "600",
              flex: 1,
              margin: "0 30px",
            }}
          />
          <button
            className="sms4sats-code-close"
            onClick={() => navigate(-1)}
          >
            <X color={textColor} size={22} />
          </button>
        </div>

        <div onClick={handleCopy} style={{ cursor: "pointer" }}>
          <ThemeText
            textContent={code}
            textStyles={{
              fontSize: "2.2rem",
              textAlign: "center",
              margin: "10px 0 8px",
              fontWeight: "700",
            }}
          />
        </div>

        {phoneNumber ? (
          <ThemeText
            textContent={phoneNumber}
            textStyles={{
              textAlign: "center",
              opacity: 0.7,
              marginBottom: 20,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
