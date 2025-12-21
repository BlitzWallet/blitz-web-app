import React, { useState, useRef } from "react";
import { Info } from "lucide-react";
import "./editProfileTextInput.css";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Colors } from "../../../../constants/theme";
import CustomInput from "../../../../components/customInput/customInput";
import ThemeText from "../../../../components/themeText/themeText";

/**
 * Reusable text input component for edit profile forms
 */
export function EditProfileTextInput({
  label,
  placeholder,
  value = "",
  onChangeText,
  onFocus,
  onBlur,
  inputRef,
  maxLength = 30,
  multiline = false,
  minHeight,
  maxHeight,
  isDarkMode = false,
  showInfoIcon = false,
  onInfoPress,
  containerStyle = {},
}) {
  const { theme, darkModeType } = useThemeContext();
  const isOverLimit = value.length >= maxLength;

  const handleChange = (e) => {
    console.log(e);
    onChangeText?.(e);
  };

  const handleContainerClick = () => {
    inputRef?.current?.focus();
  };

  return (
    <div
      className={`text-input-container ${isDarkMode ? "dark" : ""}`}
      style={containerStyle}
      onClick={handleContainerClick}
    >
      {showInfoIcon ? (
        <div className="label-row">
          <ThemeText
            textStyles={{ margin: 0 }}
            className="input-label"
            textContent={label}
          />
          <button
            type="button"
            className="info-button"
            onClick={(e) => {
              e.stopPropagation();
              onInfoPress?.();
            }}
          >
            <Info
              color={
                theme && darkModeType ? Colors.dark.text : Colors.constants.blue
              }
              size={18}
            />
          </button>
        </div>
      ) : (
        <ThemeText className="input-label" textContent={label} />
      )}
      <CustomInput
        ref={inputRef}
        containerClassName={`text-input ${isOverLimit ? "over-limit" : ""}`}
        onchange={handleChange}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        multiline={multiline}
      />
      {/* {multiline ? (
        <textarea
          ref={inputRef}
          className={`text-input ${isOverLimit ? "over-limit" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            minHeight: minHeight || 60,
            maxHeight: maxHeight || 100,
          }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          className={`text-input ${isOverLimit ? "over-limit" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          maxLength={maxLength}
        />
      )} */}
      <ThemeText
        className={`character-count ${isOverLimit ? "over-limit" : ""}`}
        textContent={`${value.length} / ${maxLength}`}
      />
    </div>
  );
}
