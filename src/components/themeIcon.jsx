import { useMemo } from "react";
import { Colors } from "../constants/theme";
import { useThemeContext } from "../contexts/themeContext";
import * as LucidIcons from "lucide-react";

export default function ThemeIcon({
  iconName,
  size = 30,
  styles,
  colorOverride,
  fill = null,
  strokeWidth = 2,
}) {
  const { theme, darkModeType } = useThemeContext();

  // Determine which icon to render based on theme
  const IconComponent = useMemo(() => {
    return LucidIcons[iconName];
  }, [theme, darkModeType, iconName]);

  // Determine the color tint
  const iconColor = useMemo(() => {
    if (colorOverride) return colorOverride;
    if (theme) {
      return darkModeType ? Colors.dark.text : Colors.constants.blue;
    }
    return Colors.constants.blue;
  }, [theme, darkModeType, colorOverride]);

  // Merge styles
  const iconStyles = useMemo(() => {
    const baseStyles = { color: iconColor };

    if (!styles) return baseStyles;

    if (Array.isArray(styles)) {
      return styles.reduce(
        (acc, style) => ({ ...acc, ...(style || {}) }),
        baseStyles,
      );
    }

    return { ...baseStyles, ...styles };
  }, [styles, iconColor]);
  if (!IconComponent) return;

  if (fill) {
    return (
      <IconComponent
        strokeWidth={strokeWidth}
        fill={fill}
        size={size}
        style={iconStyles}
      />
    );
  } else
    return (
      <IconComponent strokeWidth={strokeWidth} size={size} style={iconStyles} />
    );
}
