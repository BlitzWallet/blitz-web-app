import "./AccountCard.css";
import useThemeColors from "../../../../hooks/useThemeColors";
import { MAIN_ACCOUNT_UUID } from "../../../../contexts/activeAccount";

export default function AccountCard({
  account,
  isActive,
  onPress,
  onEdit,
  isLoading,
}) {
  const { textColor, backgroundColor } = useThemeColors();
  const isMain = account?.uuid === MAIN_ACCOUNT_UUID;
  const displayName = isMain ? "Main Account" : account?.name || "Account";

  return (
    <button
      className={`account-card${isActive ? " account-card--active" : ""}`}
      style={{ borderColor: isActive ? "#0375F6" : "transparent" }}
      onClick={onPress}
    >
      <div
        className="account-card__avatar"
        style={{ backgroundColor: isActive ? "#0375F6" : backgroundColor }}
      >
        <span style={{ color: isActive ? "#fff" : textColor }}>
          {displayName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="account-card__info">
        <span className="account-card__name" style={{ color: textColor }}>
          {displayName}
        </span>
        {isActive && (
          <span className="account-card__active-badge">Active</span>
        )}
      </div>
      {isLoading && <div className="account-card__spinner" />}
    </button>
  );
}
