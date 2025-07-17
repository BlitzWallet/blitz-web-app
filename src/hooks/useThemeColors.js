import { Colors } from "../constants/theme";
import { useThemeContext } from "../contexts/themeContext";
export default function useThemeColors() {
  const { theme, darkModeType } = useThemeContext();
  console.log(theme, darkModeType, "USE THEME COLORS TEST");
  const themeText = theme ? Colors.dark.text : Colors.light.text;
  const backgroundColor = theme
    ? darkModeType
      ? Colors.lightsout.background
      : Colors.dark.background
    : Colors.light.background;
  const themeBackgroundOffset = theme
    ? darkModeType
      ? Colors.lightsout.backgroundOffset
      : Colors.dark.backgroundOffset
    : Colors.light.backgroundOffset;

  const textInputBackground =
    !theme || darkModeType ? Colors.dark.text : themeBackgroundOffset;
  const textInputColor =
    !theme || darkModeType ? Colors.light.text : Colors.dark.text;

  console.log({
    textColor: themeText,
    backgroundOffset: themeBackgroundOffset,
    backgroundColor,
    textInputBackground,
    textInputColor,
  });
  return {
    textColor: themeText,
    backgroundOffset: themeBackgroundOffset,
    backgroundColor,
    textInputBackground,
    textInputColor,
  };
}
