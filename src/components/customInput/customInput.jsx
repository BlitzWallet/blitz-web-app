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
  onKeyDown,
  multiline = false,
  ref,
  maxLength,
  type = "text",
}) {
  const commonProps = {
    value,
    onChange: (e) => onchange(e.target.value),
    placeholder,
    className: `description-input ${textInputClassName}`,
    onFocus: () => onFocus?.(true),
    onBlur: () => onBlur?.(false),
    onKeyDown,
    style: {
      ...customInputStyles,
      resize: "none",
    },
    maxLength,
  };

  return (
    <div
      ref={ref}
      style={{ ...containerStyles }}
      className={`custom-description-input-container ${containerClassName}`}
    >
      {multiline ? (
        <textarea {...commonProps} />
      ) : (
        <input type={type} {...commonProps} />
      )}
    </div>
  );
}
