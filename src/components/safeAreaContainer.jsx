import "./style.css";

export default function SafeAreaComponent({
  children,
  addedClassName,
  backgroundColor,
  customStyles,
}) {
  return (
    <div
      style={{ backgroundColor: backgroundColor || "transparent" }}
      className="safeAreaContainerBackground"
    >
      <div
        style={customStyles}
        className={`safeAreaContainer ${addedClassName || ""}`}
      >
        {children}
      </div>
    </div>
  );
}
