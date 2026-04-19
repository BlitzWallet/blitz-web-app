import React from "react";
import "./style.css";
import BackArrow from "../backArrow/backArrow";

/**
 * Props (web-friendly)
 * - label: string
 * - onBack: function (optional) -> if not provided, uses window.history.back()
 * - containerStyle: inline style object (optional)
 * - titleStyle: inline style object (optional)
 *
 * Right side:
 * - showRight: boolean
 * - onRightPress: function
 * - rightIcon: ReactNode (preferred)  e.g. <SomeIcon />
 * - rightImageSrc: string (fallback)  e.g. '/img/settings.png'
 * - rightAlt: string
 * - badgeCount: number
 */
export default function CustomSettingsTopBar({
  label = "",
  onBack,
  containerStyle,
  titleStyle,

  showRight = false,
  onRightPress,
  rightIcon = null,
  rightImageSrc = "",
  rightAlt = "right icon",
  badgeCount = 0,
}) {
  const handleBack = () => {
    if (onBack) return onBack();
    window.history.back();
  };

  return (
    <div className="cstb-topbar" style={containerStyle}>
      <BackArrow />

      <div className="cstb-title" style={titleStyle} title={label}>
        {label}
      </div>

      {showRight && (
        <div className="cstb-rightWrap">
          <button
            type="button"
            className="cstb-rightButton"
            onClick={onRightPress}
            aria-label="Right action"
          >
            {rightIcon ? (
              <span className="cstb-rightIcon">{rightIcon}</span>
            ) : rightImageSrc ? (
              <img
                className="cstb-rightImage"
                src={rightImageSrc}
                alt={rightAlt}
              />
            ) : null}
          </button>

          {badgeCount > 0 && (
            <div
              className="cstb-badge"
              aria-label={`Badge count ${badgeCount}`}
            >
              <span className="cstb-badgeText">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
