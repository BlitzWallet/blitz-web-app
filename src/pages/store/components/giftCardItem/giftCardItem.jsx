import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../../../constants/theme";
import { STARTING_INDEX_FOR_GIFTS_DERIVE } from "../../../../constants";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { formatTimeRemaining } from "../../../../functions/gift/formatTimeRemaining";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { Share, RotateCcw } from "lucide-react";
import "./giftCardItem.css";

export default function GiftCardItem({ item, from }) {
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, textInputBackground } =
    useThemeColors();
  const navigate = useNavigate();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

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

  const iconBg = useMemo(() => {
    if (theme && darkModeType) {
      return from === "preview" || from === "overview"
        ? textInputBackground
        : backgroundOffset;
    }
    return denomination === "USD" ? "#27ae60" : "#f7931a";
  }, [theme, darkModeType, from, denomination, textInputBackground, backgroundOffset]);

  const handleAction = async (e) => {
    if (e) e.stopPropagation();

    if (isExpired) {
      navigate("/claim-gift", {
        state: {
          claimType: "reclaim",
          url: uuid,
          giftUuid: uuid,
        },
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
      style={{ backgroundColor: backgroundOffset }}
      onClick={shouldShowActions ? handleAction : undefined}
    >
      <div className="giftCardItem-icon" style={{ backgroundColor: iconBg }}>
        <span className="giftCardItem-iconText">
          {denomination === "USD" ? "$" : "₿"}
        </span>
      </div>

      <div className="giftCardItem-middle">
        <p className="giftCardItem-desc" style={{ color: textColor }}>
          {description || `Gift ${formattedNumber}`}
        </p>
        <div className="giftCardItem-statusRow">
          {description ? (
            <>
              <span className="giftCardItem-statusText" style={{ color: textColor }}>
                {formattedNumber}
              </span>
              {statusText && (
                <>
                  <span className="giftCardItem-statusText" style={{ color: textColor }}>
                    •
                  </span>
                  <span className="giftCardItem-statusText" style={{ color: textColor }}>
                    {statusText}
                  </span>
                </>
              )}
            </>
          ) : (
            statusText && (
              <span className="giftCardItem-statusText" style={{ color: textColor }}>
                {statusText}
              </span>
            )
          )}
        </div>
      </div>

      <div className="giftCardItem-right">
        <FormattedSatText
          balance={amount || 0}
          styles={{ color: textColor, fontWeight: 500, fontSize: "15px" }}
        />
        {shouldShowActions && (
          <button
            className="giftCardItem-actionIcon"
            style={{
              backgroundColor: theme
                ? textInputBackground
                : "#fff",
            }}
            onClick={handleAction}
          >
            {isExpired ? (
              <RotateCcw size={16} color={textColor} />
            ) : (
              <Share size={16} color={textColor} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
