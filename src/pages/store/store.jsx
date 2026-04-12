import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftContext";
import { useOverlay } from "../../contexts/overlayContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { Gift } from "lucide-react";
import WalletNavBar from "../wallet/components/nav/nav";
import GiftCardItem from "./components/giftCardItem/giftCardItem";
import ThemeText from "../../components/themeText/themeText";
import CustomButton from "../../components/customButton/customButton";
import "./store.css";

export default function Store() {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const { openOverlay } = useOverlay();
  const { masterInfoObject } = useGlobalContextProvider();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;
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
      const isTerminal = g.state === "Claimed" || g.state === "Reclaimed";
      const isExpired = !isTerminal && g.expireTime && now >= g.expireTime;
      return !isTerminal && !isExpired;
    });
  }, [giftsArray]);

  const hasAnyGifts = giftsArray.length > 0;
  const hasActiveGifts = activeGifts.length > 0;
  const hasExpiredGifts = expiredGiftsArray.length > 0;

  return (
    <div className="giftsOverviewContainer" style={{ backgroundColor }}>
      <div className="giftsOverview-nav">
        <WalletNavBar
          didEnabledLrc20={didEnabledLrc20}
          openOverlay={openOverlay}
        />
      </div>
      <div className="giftsOverview-list">
        {hasActiveGifts && (
          <div className="giftsOverview-section">
            <ThemeText
              textContent="Active"
              className="giftsOverview-sectionTitle"
              textStyles={{ opacity: 0.8 }}
            />
            {activeGifts.map((gift) => (
              <GiftCardItem key={gift.uuid} item={gift} from="overview" />
            ))}
          </div>
        )}

        <div className="giftsOverview-section">
          <div className="giftsOverview-sectionHeader">
            <ThemeText
              textContent="Expired"
              className="giftsOverview-sectionTitle"
              textStyles={{ opacity: 0.8 }}
            />
            {hasExpiredGifts && (
              <button
                type="button"
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
              style={{
                backgroundColor: backgroundOffset,
                border: theme
                  ? darkModeType
                    ? "1px solid rgba(255, 255, 255, 0.1)"
                    : "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <ThemeText
                textContent="No expired gifts to reclaim"
                className="giftsOverview-expiredEmptyText"
                textStyles={{ opacity: 0.55 }}
              />
              <button
                type="button"
                className="giftsOverview-advancedLink"
                style={{ color: colors.giftCardBlue }}
                onClick={() => navigate("/reclaim-gift")}
              >
                Reclaim Gift
              </button>
            </div>
          )}
        </div>

        {!hasAnyGifts && (
          <div className="giftsOverview-empty">
            <Gift
              className="giftsOverview-emptyIcon"
              size={56}
              color={colors.giftCardBlue}
              strokeWidth={1.5}
              aria-hidden
            />
            <ThemeText
              textContent="No gifts yet"
              className="giftsOverview-emptyTitle"
            />
            <ThemeText
              textContent="Create a gift to send Bitcoin to anyone with a simple link."
              className="giftsOverview-emptyDesc"
              textStyles={{ opacity: 0.6 }}
            />
          </div>
        )}
      </div>

      <div className="giftsOverview-actions">
        <CustomButton
          actionFunction={() => navigate("/create-gift")}
          textContent="Create Gift"
        />
        <CustomButton
          actionFunction={() =>
            openOverlay({
              for: "halfModal",
              contentType: "claimGiftHalfModal",
              params: { sliderHeight: "40dvh" },
            })
          }
          textContent="Claim Gift"
          buttonStyles={{ backgroundColor: Colors.constants.blue }}
          textStyles={{ color: "#FFFFFF" }}
        />
      </div>
    </div>
  );
}
