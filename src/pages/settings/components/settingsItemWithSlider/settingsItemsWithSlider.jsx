import { useNavigate } from "react-router-dom";
import "./SettingsItemWithSlider.css";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { Colors } from "../../../../constants/theme";
import ThemeText from "../../../../components/themeText/themeText";
import CustomToggleSwitch from "../../../../components/switch/switch";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import { Info } from "lucide-react";

export default function SettingsItemWithSlider({
  settingsTitle = "",
  settingDescription = "",
  showDescription = true,
  switchPageName,
  handleSubmit,
  showInformationPopup = false,
  informationPopupText = "",
  informationPopupBTNText = "",
  showLoadingIcon = false,
  toggleSwitchStateValue,
  containerStyles = {},
  openOverlay,
}) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();

  const goToInformationPopup = () => {
    openOverlay({
      for: "informationPopup",
      textContent: informationPopupText,
      buttonText: informationPopupBTNText,
    });
  };

  return (
    <div
      className="settings-item-container"
      style={{
        backgroundColor: theme ? backgroundOffset : Colors.dark.text,
        ...containerStyles,
      }}
    >
      <div
        className="settings-item-header"
        style={{
          borderBottom: showDescription
            ? `1px solid ${backgroundColor}`
            : "none",
          marginBottom: showDescription ? 20 : 0,
          paddingBottom: showDescription ? 10 : 0,
        }}
      >
        <ThemeText textStyles={{ flexShrink: 1 }} textContent={settingsTitle} />
        <div className="settings-right-section">
          {showLoadingIcon && (
            <FullLoadingScreen
              containerStyles={{
                marginLeft: showInformationPopup ? 5 : 10,
                marginRight: 5,
              }}
              size="small"
              showText={false}
              loadingColor={theme ? textColor : Colors.constants.blue}
            />
          )}

          {showInformationPopup && (
            <button
              type="button"
              onClick={goToInformationPopup}
              className="info-button"
            >
              <Info
                size={20}
                color={
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.blue
                }
              />
            </button>
          )}

          <CustomToggleSwitch
            toggleSwitchFunction={handleSubmit}
            page={switchPageName}
            stateValue={toggleSwitchStateValue}
            containerStyles={{ marginLeft: "auto" }}
          />
        </div>
      </div>

      {showDescription && (
        <div className="settings-description">
          <ThemeText textContent={settingDescription} />
        </div>
      )}
    </div>
  );
}
