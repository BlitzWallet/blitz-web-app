import "./SettingsRow.css";
import { ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import useThemeColors from "../../../hooks/useThemeColors";

export default function SettingsRow({
  iconName,
  label,
  inlineValue,
  onPress,
  isLast,
  isDestructive,
}) {
  const { backgroundColor, textColor } = useThemeColors();
  const IconComponent = iconName ? LucideIcons[iconName] : null;

  return (
    <button
      className="settings-row"
      style={{
        borderBottom: !isLast
          ? `1px solid ${backgroundColor}`
          : "none",
        color: isDestructive ? "#FF3B30" : textColor,
      }}
      onClick={onPress}
    >
      {IconComponent && (
        <IconComponent
          size={20}
          color={isDestructive ? "#FF3B30" : textColor}
          className="settings-row__icon"
        />
      )}
      <span
        className="settings-row__label"
        style={{ marginLeft: IconComponent ? 12 : 0 }}
      >
        {label}
      </span>
      {inlineValue && (
        <span className="settings-row__inline-value" style={{ color: textColor }}>
          {inlineValue}
        </span>
      )}
      <ChevronRight size={18} color={isDestructive ? "#FF3B30" : textColor} />
    </button>
  );
}
