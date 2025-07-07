import { useNavigate } from "react-router-dom";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { QUICK_PAY_STORAGE_KEY } from "../../../../constants";
import { useCallback } from "react";
import TextInputWithSliderSettingsItem from "../../components/textInputWithSliderSettingsItem/textInputWithSliderSettingsItem";
import "./fastPay.css";

export default function FastPay() {
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const navigate = useNavigate();
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
        navigate.navigate("ErrorScreen", {
          errorMessage: t("settings.fastpay.text1"),
        });
        return;
      }
      if (parseValue === 0) {
        resetFunction();
        navigate.navigate("ErrorScreen", {
          errorMessage: t("settings.fastpay.text2"),
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
