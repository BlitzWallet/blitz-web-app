import "./SectionCard.css";
import useThemeColors from "../../../hooks/useThemeColors";

export default function SectionCard({ title, children }) {
  const { backgroundOffset, textColor } = useThemeColors();

  return (
    <div className="section-card-wrapper">
      {title && (
        <p className="section-card-title" style={{ color: textColor }}>
          {title}
        </p>
      )}
      <div
        className="section-card-body"
        style={{ backgroundColor: backgroundOffset }}
      >
        {children}
      </div>
    </div>
  );
}
