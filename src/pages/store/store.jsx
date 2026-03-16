import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftsContext";
import { useOverlay } from "../../contexts/overlayContext";
import GiftCardItem from "./components/giftCardItem/giftCardItem";
import "./store.css";

export default function Store() {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, textInputBackground } = useThemeColors();
  const { openOverlay } = useOverlay();
  const { giftsArray, expiredGiftsArray, checkForRefunds } = useGifts();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  useEffect(() => {
    checkForRefunds();
  }, []);

  const activeGifts = useMemo(() => {
    const now = Date.now();
    return giftsArray.filter((g) => {
      const isTerminal =
        g.state === "Claimed" || g.state === "Reclaimed";
      const isExpired =
        !isTerminal && g.expireTime && now >= g.expireTime;
      return !isTerminal && !isExpired;
    });
  }, [giftsArray]);

  const hasAnyGifts = giftsArray.length > 0;
  const hasActiveGifts = activeGifts.length > 0;
  const hasExpiredGifts = expiredGiftsArray.length > 0;

  return (
    <div className="giftsOverviewContainer">
      <div className="giftsOverview-list">
        {hasActiveGifts && (
          <div className="giftsOverview-section">
            <p
              className="giftsOverview-sectionTitle"
              style={{ color: textColor }}
            >
              Active
            </p>
            {activeGifts.map((gift) => (
              <GiftCardItem key={gift.uuid} item={gift} from="overview" />
            ))}
          </div>
        )}

        <div className="giftsOverview-section">
          <div className="giftsOverview-sectionHeader">
            <p
              className="giftsOverview-sectionTitle"
              style={{ color: textColor }}
            >
              Expired
            </p>
            {hasExpiredGifts && (
              <button
                className="giftsOverview-reclaimLink"
                style={{ color: colors.giftCardBlue }}
                onClick={() => navigate("/reclaim-gift")}
              >
                Reclaim All
              </button>
            )}
          </div>

          {hasExpiredGifts ? (
            expiredGiftsArray.map((gift) => (
              <GiftCardItem key={gift.uuid} item={gift} from="overview" />
            ))
          ) : (
            <div
              className="giftsOverview-expiredEmpty"
              style={{ backgroundColor: backgroundOffset }}
            >
              <p
                className="giftsOverview-expiredEmptyText"
                style={{ color: textColor }}
              >
                No expired gifts to reclaim
              </p>
              <button
                className="giftsOverview-advancedLink"
                style={{ color: colors.giftCardBlue }}
                onClick={() => navigate("/reclaim-gift")}
              >
                Advanced Recovery
              </button>
            </div>
          )}
        </div>

        {!hasAnyGifts && (
          <div className="giftsOverview-empty">
            <div className="giftsOverview-emptyIcon">🎁</div>
            <p
              className="giftsOverview-emptyTitle"
              style={{ color: textColor }}
            >
              No gifts yet
            </p>
            <p
              className="giftsOverview-emptyDesc"
              style={{ color: textColor }}
            >
              Create a gift to send Bitcoin to anyone with a simple link.
            </p>
          </div>
        )}
      </div>

      <div className="giftsOverview-buttonGroup">
        <button
          className="giftsOverview-btn"
          style={{
            backgroundColor: colors.giftCardBlue,
            color: "#fff",
          }}
          onClick={() => navigate("/create-gift")}
        >
          Create Gift
        </button>
        <button
          className="giftsOverview-btn"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : colors.giftCardBlue,
            color: "#fff",
          }}
          onClick={() =>
            openOverlay({
              for: "halfModal",
              contentType: "claimGiftHalfModal",
              params: { sliderHeight: "40dvh" },
            })
          }
        >
          Claim Gift
        </button>
      </div>
    </div>
  );
}
