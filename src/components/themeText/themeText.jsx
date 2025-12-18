import { useMemo } from "react";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";

export default function ThemeText({
  textContent,
  colorOverride,
  textStyles,
  className,
  reversed,
  clickFunction,
  ref,
}) {
  const { theme } = useThemeContext();

  const memorizedStyles = useMemo(
    () => ({
      color: theme
        ? reversed
          ? Colors.light.text
          : Colors.dark.text
        : reversed
        ? Colors.dark.text
        : Colors.light.text,
      ...textStyles,
    }),
    [theme, textStyles]
  );
  return (
    <p
      ref={ref}
      onClick={() => {
        if (clickFunction) {
          clickFunction();
        }
      }}
      className={`${className || ""}`}
      style={memorizedStyles}
    >
      {textContent}
    </p>
  );
}
