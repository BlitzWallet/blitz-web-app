import React, { useCallback, useState } from "react";

// import GetThemeColors from "../../../hooks/themeColors";

// import { COLORS, FONT, SIZES } from "../../../constants";
// import { useGlobalThemeContext } from "../../../../context-store/theme";
import { Colors } from "../../../../constants/theme";
import ThemeText from "../../../../components/themeText/themeText";
import CustomToggleSwitch from "../../../../components/switch/switch";
import "./textInputWithSliderSettingsItem.css";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function TextInputWithSliderSettingsItem({
  sliderTitle = "",
  settingInputTitle = "",
  settingDescription = "",
  defaultTextInputValue,
  handleSubmit,
  CustomToggleSwitchFunction,
  switchStateValue,
  switchPage,
}) {
  const { theme } = useThemeContext();
  const [inputValue, setInputValue] = useState(undefined);
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();

  const resetInputValue = useCallback(() => {
    setInputValue(String(defaultTextInputValue));
  }, [defaultTextInputValue]);

  return (
    <div
      id="textInputWithSliderSettingsItem"
      style={{
        backgroundColor: theme ? backgroundOffset : Colors.dark.text,
      }}
    >
      <div
        className="switchContainer"
        style={{
          borderBottom: `1px solid ${backgroundColor}`,
        }}
      >
        <ThemeText
          className="sliderTitle"
          textStyles={{ flex: 1 }}
          textContent={sliderTitle}
        />
        <CustomToggleSwitch
          page={switchPage}
          toggleSwitchFunction={CustomToggleSwitchFunction}
          stateValue={switchStateValue}
          containerStyles={{}}
        />
      </div>

      <div className="textInputcontainer">
        <ThemeText className="inputTitle" textContent={settingInputTitle} />
        <input
          className="textInput"
          type="number"
          value={inputValue}
          defaultValue={String(defaultTextInputValue)}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            if (!inputValue) {
              resetInputValue();
              return;
            }
            if (inputValue == defaultTextInputValue) {
              resetInputValue();
              return;
            }
            if (!handleSubmit) {
              resetInputValue();
              return;
            }
            handleSubmit(inputValue, resetInputValue);
          }}
          style={{
            color: textColor,
            backgroundColor: backgroundColor,
          }}
        />
      </div>

      <div style={{ paddingRight: 10, marginLeft: 20 }}>
        <ThemeText textContent={settingDescription} />
      </div>
    </div>
  );
}
