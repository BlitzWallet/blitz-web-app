import "./GiftCardItem.css";
import { Gift } from "lucide-react";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function GiftCardItem({ item, showDivider }) {
  const { textColor, backgroundColor } = useThemeColors();
  const amount = item?.amount || item?.amountSat || 0;

  return (
    <div
      className="gift-card-item"
      style={{
        borderBottom: showDivider ? `1px solid ${backgroundColor}` : "none",
      }}
    >
      <div
        className="gift-card-item__icon"
        style={{ backgroundColor: "rgba(3, 117, 246, 0.12)" }}
      >
        <Gift size={16} color="#0375F6" />
      </div>
      <div className="gift-card-item__info">
        <span className="gift-card-item__label" style={{ color: textColor }}>
          {item?.name || "Gift"}
        </span>
        <span className="gift-card-item__amount" style={{ color: textColor }}>
          {amount.toLocaleString()} sats
        </span>
      </div>
    </div>
  );
}
