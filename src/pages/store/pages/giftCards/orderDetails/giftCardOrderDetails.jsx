import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useToast } from "../../../../../contexts/toastManager";
import { Colors } from "../../../../../constants/theme";
import { HIDDEN_OPACITY } from "../../../../../constants/theme";
import "../style.css";

export default function GiftCardOrderDetails({ item }) {
  const { backgroundColor } = useThemeColors();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: "clipboard", title: "Copied to clipboard!" });
    } catch {
      showToast({ type: "error", title: "Failed to copy" });
    }
  }

  if (!item) {
    return (
      <div
        className="orderDetailsOverlay"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        onClick={() => navigate(-1)}
      >
        <div
          className="orderDetailsContent"
          style={{ backgroundColor }}
          onClick={(e) => e.stopPropagation()}
        >
          <ThemeText
            textContent="No order selected"
            textStyles={{ textAlign: "center" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="orderDetailsOverlay"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      onClick={() => navigate(-1)}
    >
      <div
        className="orderDetailsContent"
        style={{ backgroundColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <ThemeText
          textContent={t("apps.giftCards.giftCardOrderDetails.title")}
          textStyles={{ fontSize: 18, textAlign: "center" }}
        />

        <ThemeText
          textContent={t("apps.giftCards.giftCardOrderDetails.invoice")}
          textStyles={{ marginTop: 20, marginBottom: 0 }}
        />
        <button
          className="orderDetailsItemBtn"
          onClick={() => copyText(item.invoice)}
        >
          <ThemeText
            textContent={item.invoice}
            textStyles={{
              opacity: HIDDEN_OPACITY,
              fontSize: 12,
              margin: 0,
              wordBreak: "break-all",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          />
        </button>

        <ThemeText
          textContent={t("apps.giftCards.giftCardOrderDetails.orderId")}
          textStyles={{ marginBottom: 0 }}
        />
        <button
          className="orderDetailsItemBtn"
          onClick={() => copyText(String(item.id))}
        >
          <ThemeText
            textContent={String(item.id)}
            textStyles={{ opacity: HIDDEN_OPACITY, fontSize: 12, margin: 0 }}
          />
        </button>

        <ThemeText
          textContent={t("apps.giftCards.giftCardOrderDetails.uuid")}
          textStyles={{ marginBottom: 0 }}
        />
        <button
          className="orderDetailsItemBtn"
          onClick={() => copyText(item.uuid)}
        >
          <ThemeText
            textContent={item.uuid}
            textStyles={{
              opacity: HIDDEN_OPACITY,
              fontSize: 12,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          />
        </button>

        <CustomButton
          textContent={t("apps.giftCards.giftCardOrderDetails.openInbox")}
          actionFunction={() =>
            window.open("mailto:support@thebitcoincompany.com", "_self")
          }
          buttonStyles={{ marginTop: 20, width: "100%" }}
        />
      </div>
    </div>
  );
}
