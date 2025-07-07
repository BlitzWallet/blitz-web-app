import React, { useCallback, useState } from "react";

// import GetThemeColors from "../../../hooks/themeColors";

// import { COLORS, FONT, SIZES } from "../../../constants";
// import { useGlobalThemeContext } from "../../../../context-store/theme";
import { Colors } from "../../../../constants/theme";
import ThemeText from "../../../../components/themeText/themeText";
import CustomToggleSwitch from "../../../../components/switch/switch";
import "./textInputWithSliderSettingsItem.css";

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
  const { theme } = { theme: false }; // useGlobalThemeContext();
  const [inputValue, setInputValue] = useState(undefined);
  //   const { backgroundOffset, backgroundColor, textColor } = GetThemeColors();

  const resetInputValue = useCallback(() => {
    setInputValue(String(defaultTextInputValue));
  }, [defaultTextInputValue]);

  return (
    <div
      id="textInputWithSliderSettingsItem"
      style={{
        backgroundColor: theme ? Colors.dark.background : Colors.dark.text,
      }}
    >
      <div
        className="switchContainer"
        style={{
          borderBottom: `1px solid ${Colors.light.background}`,
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
            backgroundColor: Colors.light.background,
          }}
        />
      </div>

      <div style={{ paddingRight: 10, marginLeft: 20 }}>
        <ThemeText textContent={settingDescription} />
      </div>
    </div>
  );
}
