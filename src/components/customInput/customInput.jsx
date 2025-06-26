import "./style.css";

export default function CustomInput({
  onchange,
  placeholder,
  value,
  textInputClassName = "",
  customInputStyles = {},
  containerClassName = "",
  containerStyles = {},
  onFocus,
  onBlur,
  multiline = false,
}) {
  const commonProps = {
    value,
    onChange: (e) => onchange(e.target.value),
    placeholder,
    className: `description-input ${textInputClassName}`,
    onFocus: () => onFocus?.(true),
    onBlur: () => onBlur?.(false),
    style: {
      ...customInputStyles,
      resize: "none",
    },
  };

  return (
    <div
      style={{ ...containerStyles }}
      className={`custom-description-input-container ${containerClassName}`}
    >
      {multiline ? (
        <textarea {...commonProps} />
      ) : (
        <input type="text" {...commonProps} />
      )}
    </div>
  );
}
