import { useMemo } from "react";
import { useThemeContext } from "../../contexts/themeContext";
import { darkMode } from "../../constants/icons";

export default function ThemeImage({
  styles,
  icon,
  // lightModeIcon,
  // lightsOutIcon,
  // darkModeIcon,
  alt = "icon",
  clickFunction,
  className = "",
  filter = undefined,
}) {
  const { theme, darkModeType } = useThemeContext();
  const imageStyles = useMemo(() => {
    return {
      width: 30,
      height: 30,
      filter: filter
        ? filter
        : theme && darkModeType
        ? "brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(7500%) hue-rotate(137deg) brightness(113%) contrast(101%)"
        : "initial",
      ...styles,
    };
  }, [styles, theme, darkMode, filter]);
  // const imageSource = useMemo(() => {
  //   return theme
  //     ? darkModeType
  //       ? lightsOutIcon
  //       : darkModeIcon
  //     : lightModeIcon;
  // }, [theme, darkModeType, lightsOutIcon, darkModeIcon, lightModeIcon]);

  return (
    <img
      className={className}
      onClick={() => {
        if (clickFunction) {
          clickFunction();
        }
      }}
      style={imageStyles}
      src={icon}
      alt={alt}
    />
  );
}
