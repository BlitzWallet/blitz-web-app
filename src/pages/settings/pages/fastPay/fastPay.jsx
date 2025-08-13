import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { QUICK_PAY_STORAGE_KEY } from "../../../../constants";
import { useCallback } from "react";
import TextInputWithSliderSettingsItem from "../../components/textInputWithSliderSettingsItem/textInputWithSliderSettingsItem";
import "./fastPay.css";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function FastPay() {
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useThemeContext();
  const { backgroundOffset } = useThemeColors();
  const fastPayThreshold =
    masterInfoObject[QUICK_PAY_STORAGE_KEY].fastPayThresholdSats;
  const isOn = masterInfoObject[QUICK_PAY_STORAGE_KEY].isFastPayEnabled;

  const handleSlider = useCallback(() => {
    toggleMasterInfoObject({
      [QUICK_PAY_STORAGE_KEY]: {
        ...masterInfoObject[QUICK_PAY_STORAGE_KEY],
        isFastPayEnabled: !isOn,
      },
    });
  }, [masterInfoObject]);

  const handleSubmit = useCallback(
    (value, resetFunction) => {
      const parseValue = Number(value);
      if (isNaN(parseValue)) {
        resetFunction();
        navigate("/error", {
          state: {
            errorMessage: "Value must be a number",
            background: location,
          },
        });

        return;
      }
      if (parseValue === 0) {
        resetFunction();
        navigate("/error", {
          state: {
            errorMessage: "Must be greater than 0",
            background: location,
          },
        });
        return;
      }
      toggleMasterInfoObject({
        [QUICK_PAY_STORAGE_KEY]: {
          ...masterInfoObject[QUICK_PAY_STORAGE_KEY],
          fastPayThresholdSats: parseValue,
        },
      });
    },
    [masterInfoObject]
  );

  return (
    <div id="fastPayContainer">
      <div className="customSwitchContainer">
        <TextInputWithSliderSettingsItem
          sliderTitle={"Enable Fast Pay"}
          settingInputTitle={"Fast pay threshold (SAT)"}
          settingDescription={
            "Fast pay allows you to instantly pay invoices below a specified threshold without needing to swipe for confirmation."
          }
          defaultTextInputValue={fastPayThreshold}
          handleSubmit={handleSubmit}
          CustomToggleSwitchFunction={handleSlider}
          switchStateValue={isOn}
          switchPage="fastPay"
        />
      </div>
    </div>
  );
}
