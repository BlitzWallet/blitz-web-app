import "./PoolsPreview.css";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { useThemeContext } from "../../../contexts/themeContext";
import { Colors } from "../../../constants/theme";
import useThemeColors from "../../../hooks/useThemeColors";
import WidgetCard from "./WidgetCard";
import CircularProgress from "./stubs/CircularProgress";

export default function PoolsPreview({ activePoolsArray, poolsArray, onViewAll }) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const { t } = useTranslation();

  const displayedPools = (activePoolsArray || []).slice(0, 2);
  const hasMorePools = (activePoolsArray || []).length > 2;
  const remainingPoolsCount = (activePoolsArray || []).length - 2;

  const iconBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundColor
        : backgroundOffset
      : Colors.primary || "#0375F6";

  if (!(poolsArray || []).length) {
    return (
      <WidgetCard onPress={onViewAll}>
        <div className="pools-preview__row">
          <div className="pools-preview__left">
            <span className="pools-preview__title" style={{ color: textColor }}>
              {t("settings.accountsPoolsScreen.poolsTitle")}
            </span>
            <span className="pools-preview__desc" style={{ color: textColor }}>
              {t("wallet.pools.collectPaymentsDescription")}
            </span>
          </div>
          <div
            className="pools-preview__icon-wrap"
            style={{ backgroundColor: iconBg }}
          >
            <PiggyBank size={22} color="#fff" />
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard onPress={onViewAll}>
      <div className="pools-preview__header">
        <span className="pools-preview__title" style={{ color: textColor }}>
          {t("settings.accountsPoolsScreen.poolsTitle")}
        </span>
        {!!(poolsArray || []).length && (
          <span className="pools-preview__view-all" style={{ color: textColor }}>
            {t("settings.hub.viewAll")}
          </span>
        )}
      </div>

      {(activePoolsArray || []).length > 0 ? (
        <>
          {displayedPools.map((pool) => (
            <div key={pool.poolId} className="pools-preview__pool-row">
              <CircularProgress
                current={pool.currentAmount}
                goal={pool.goalAmount}
                size={35}
                strokeWidth={3}
                showConfirmed={pool.currentAmount >= pool.goalAmount}
              />
              <span
                className="pools-preview__pool-title"
                style={{ color: textColor }}
              >
                {pool.poolTitle}
              </span>
            </div>
          ))}
          {hasMorePools && (
            <span
              className="pools-preview__more"
              style={{ color: textColor }}
            >
              {t("settings.hub.morePoolsCount", { count: remainingPoolsCount })}
            </span>
          )}
        </>
      ) : (
        <span className="pools-preview__desc" style={{ color: textColor }}>
          {!(poolsArray || []).length
            ? t("settings.accountsPoolsScreen.noPoolsMessage")
            : t("settings.accountsPoolsScreen.noActivePools")}
        </span>
      )}
    </WidgetCard>
  );
}
