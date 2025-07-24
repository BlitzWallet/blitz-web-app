import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import FullLoadingScreen from "../fullLoadingScreen/fullLoadingScreen";
import ThemeText from "../themeText/themeText";
import "./style.css";

export default function CustomButton({
  buttonStyles,
  textStyles,
  actionFunction,
  textContent,
  useLoading,
  buttonClassName,
  textClassName,
}) {
  const { theme, darkModeType } = useThemeContext();
  return (
    <button
      onClick={() => {
        if (!actionFunction) return;
        actionFunction();
      }}
      style={{ backgroundColor: Colors.dark.text, ...buttonStyles }}
      className={`customButton ${buttonClassName}`}
    >
      {useLoading ? (
        <FullLoadingScreen
          showText={false}
          size="small"
          loadingColor={Colors.light.text}
        />
      ) : (
        <ThemeText
          className={textClassName}
          textContent={textContent}
          textStyles={{
            color: theme
              ? darkModeType
                ? Colors.lightsout.background
                : Colors.dark.background
              : Colors.light.text,
            ...textStyles,
          }}
        />
      )}
    </button>
  );
}
