import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../../../constants/theme";
import { STARTING_INDEX_FOR_GIFTS_DERIVE } from "../../../../constants";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { formatTimeRemaining } from "../../../../functions/gift/formatTimeRemaining";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import ThemeText from "../../../../components/themeText/themeText";
import { Copy, RotateCcw, Share } from "lucide-react";
import "./giftCardItem.css";
import { ICONS } from "../../../../constants";
import ThemeImage from "../../../../components/ThemeImage/themeImage";

export default function GiftCardItem({ item, from }) {
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, textInputBackground } = useThemeColors();
  const navigate = useNavigate();

  const {
    amount,
    description,
    expireTime,
    giftNum,
    state,
    claimURL,
    uuid,
    denomination = "BTC",
  } = item;

  const timeRemaining = useMemo(
    () => (expireTime ? formatTimeRemaining(expireTime) : null),
    [expireTime],
  );
  const isExpired = timeRemaining && timeRemaining.time <= 0;

  const statusText = useMemo(() => {
    if (state === "Claimed" || state === "Reclaimed" || state === "Expired") {
      return state;
    }
    return timeRemaining?.string || "";
  }, [state, timeRemaining]);

  const formattedNumber = `#${(giftNum - STARTING_INDEX_FOR_GIFTS_DERIVE)
    .toString()
    .padStart(3, "0")}`;

  const shouldShowActions =
    state !== "Claimed" && state !== "Reclaimed" && from !== "preview";

  const iconBg = useMemo(
    () => (denomination === "USD" ? "#27ae60" : "#f7931a"),
    [denomination],
  );

  const cardSurface = useMemo(() => {
    const border = theme
      ? darkModeType
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(255, 255, 255, 0.12)"
      : "1px solid rgba(0, 0, 0, 0.06)";
    return { backgroundColor: backgroundOffset, border };
  }, [theme, darkModeType, backgroundOffset]);

  const actionButtonBg = useMemo(() => {
    if (!theme) return "#ffffff";
    if (darkModeType) return Colors.lightsout.lightsOutModeOpacityInput;
    return textInputBackground;
  }, [theme, darkModeType, textInputBackground]);

  const handleAction = async (e) => {
    if (e) e.stopPropagation();

    if (isExpired) {
      navigate("/claim-gift", {
        state: { claimType: "reclaim", url: uuid, giftUuid: uuid },
      });
      return;
    }

    if (claimURL) {
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Blitz Gift",
            text: "Claim your Bitcoin gift!",
            url: claimURL,
          });
        } else {
          await navigator.clipboard.writeText(claimURL);
        }
      } catch {
        /* user cancelled share */
      }
    }
  };

  return (
    <div
      className="giftCardItem"
      style={cardSurface}
      onClick={shouldShowActions ? handleAction : undefined}
      data-expired={isExpired ? "true" : undefined}
    >
      <div className="giftCardItem-icon" style={{ backgroundColor: iconBg }}>
        <ThemeImage
          icon={denomination === "USD" ? ICONS.dollarIcon : ICONS.bitcoinIcon}
          className="giftCardItem-iconImage"
          styles={{ width: 20, height: 20 }}
          alt={
            denomination === "USD" ? "Dollar gift icon" : "Bitcoin gift icon"
          }
        />
      </div>

      <div className="giftCardItem-middle">
        <ThemeText
          textContent={description || `Gift ${formattedNumber}`}
          className="giftCardItem-desc"
        />
        <div className="giftCardItem-statusRow" style={{ color: textColor }}>
          {description ? (
            <div className="giftCardItem-combinedStatus">
              <span className="giftCardItem-statusText giftCardItem-muted">
                {formattedNumber}
              </span>
              {statusText && (
                <>
                  <span
                    className="giftCardItem-statusText giftCardItem-muted giftCardItem-dot"
                    aria-hidden
                  >
                    •
                  </span>
                  <span className="giftCardItem-statusText giftCardItem-muted">
                    {statusText}
                  </span>
                </>
              )}
            </div>
          ) : (
            statusText && (
              <span className="giftCardItem-statusText giftCardItem-muted">
                {statusText}
              </span>
            )
          )}
        </div>
      </div>

      <div className="giftCardItem-right">
        <FormattedSatText
          balance={amount || 0}
          // styles={{ color: textColor, fontWeight: 600, fontSize: "0.85rem" }}
        />
        {shouldShowActions && (
          <div className="giftCardItem-actionsContainer">
            <button
              type="button"
              className="giftCardItem-actionIcon"
              style={{ backgroundColor: actionButtonBg }}
              onClick={handleAction}
              aria-label={isExpired ? "Reclaim gift" : "Share gift link"}
            >
              {isExpired ? (
                <RotateCcw size={18} strokeWidth={2} color={textColor} />
              ) : (
                <Share size={18} strokeWidth={2} color={textColor} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
