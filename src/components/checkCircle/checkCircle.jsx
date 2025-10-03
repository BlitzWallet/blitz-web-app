import "./style.css";
import { Colors } from "../../constants/theme";
import useThemeColors from "../../hooks/useThemeColors";
import { useThemeContext } from "../../contexts/themeContext";
import { checkMark } from "../../constants/icons";

export default function CheckCircle({ isActive, containerSize = 30 }) {
  const { theme } = useThemeContext();
  const { backgroundOffset } = useThemeColors();
  return (
    <div
      style={{
        backgroundColor: isActive
          ? theme
            ? backgroundOffset
            : Colors.light.blue
          : "transparent",
        borderWidth: isActive ? 0 : "2px",
        borderColor: theme
          ? isActive
            ? backgroundOffset
            : Colors.dark.text
          : isActive
          ? Colors.light.blue
          : Colors.light.text,
        height: containerSize,
        width: containerSize,
      }}
      id="customCheckCircle"
    >
      {isActive && <img src={checkMark} alt="" className="checkMark" />}
    </div>
  );
}
