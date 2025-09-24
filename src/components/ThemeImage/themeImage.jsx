import { useMemo } from "react";
import { useThemeContext } from "../../contexts/themeContext";

export default function ThemeImage({
  styles,
  lightModeIcon,
  lightsOutIcon,
  darkModeIcon,
  alt = "icon",
  clickFunction,
  className = "",
}) {
  const { theme, darkModeType } = useThemeContext();
  const imageStyles = useMemo(() => {
    return {
      width: 30,
      height: 30,
      ...styles,
    };
  }, [styles]);
  const imageSource = useMemo(() => {
    return theme
      ? darkModeType
        ? lightsOutIcon
        : darkModeIcon
      : lightModeIcon;
  }, [theme, darkModeType, lightsOutIcon, darkModeIcon, lightModeIcon]);

  return (
    <img
      className={className}
      onClick={() => {
        if (clickFunction) {
          clickFunction();
        }
      }}
      style={imageStyles}
      src={imageSource}
      alt={alt}
    />
  );
}
