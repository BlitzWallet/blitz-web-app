import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PageNavBar from "../../../../components/navBar/navBar";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import SettingsItemWithSlider from "../../components/settingsItemWithSlider/settingsItemsWithSlider";
import displayCorrectDenomination from "../../../../functions/displayCorrectDenomination";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { useSpark } from "../../../../contexts/sparkContext";

export default function SparkSettingsPage({ openOverlay }) {
  const { sparkInformation } = useSpark();
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const isInitialRender = useRef(true);
  const lrc20Settings = masterInfoObject.lrc20Settings || {};
  const { t } = useTranslation();

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (!lrc20Settings.isEnabled) return;
    if (sparkInformation.balance > 10) return;

    openOverlay({
      for: "informationPopup",
      textContent: t("settings.sparkLrc20.balanceError", {
        balance: displayCorrectDenomination({
          amount: sparkInformation.balance,
          masterInfoObject,
          fiatStats,
        }),
        fee: displayCorrectDenomination({
          amount: 10,
          masterInfoObject,
          fiatStats,
        }),
      }),
      buttonText: t("constants.understandText"),
    });
  }, [lrc20Settings, sparkInformation.balance, fiatStats]);

  return (
    <>
      <PageNavBar label={t("settings.sparkLrc20.title")} />
      <div className="scroll-container">
        <div className="settings-container">
          <SettingsItemWithSlider
            settingsTitle={t("settings.sparkLrc20.sliderTitle", {
              switchType: lrc20Settings.isEnabled
                ? t("constants.enabled")
                : t("constants.disabled"),
            })}
            switchPageName="lrc20Settings"
            showDescription={true}
            settingDescription={t("settings.sparkLrc20.sliderDesc", {
              fee: displayCorrectDenomination({
                amount: 10,
                masterInfoObject,
                fiatStats,
              }),
            })}
            handleSubmit={() =>
              toggleMasterInfoObject({
                lrc20Settings: {
                  ...lrc20Settings,
                  isEnabled: !lrc20Settings.isEnabled,
                },
              })
            }
            toggleSwitchStateValue={lrc20Settings.isEnabled}
            openOverlay={openOverlay}
          />
        </div>
      </div>
    </>
  );
}
