import "./WidgetCard.css";
import useThemeColors from "../../../hooks/useThemeColors";

export default function WidgetCard({ children, onPress, style }) {
  const { backgroundOffset } = useThemeColors();
  const isInteractive = !!onPress;

  return (
    <div
      className={`widget-card${isInteractive ? " widget-card--interactive" : ""}`}
      style={{ backgroundColor: backgroundOffset, ...style }}
      onClick={isInteractive ? onPress : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => (e.key === "Enter" || e.key === " ") && onPress()
          : undefined
      }
    >
      {children}
    </div>
  );
}
