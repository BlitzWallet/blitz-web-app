import { useLocation, useNavigate } from "react-router-dom";
import "./nav.css";
import { useCallback, useState } from "react";
import { useSpark } from "../../../../contexts/sparkContext";
import { fullRestoreSparkState } from "../../../../functions/spark/restore";
import { useThemeContext } from "../../../../contexts/themeContext";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useActiveCustodyAccount } from "../../../../contexts/activeAccount";
import {
  darkMode,
  lightMode,
  lightModeWhite,
  refresh,
  refreshWhite,
  settingsIcon,
  settingsWhite,
} from "../../../../constants/icons";

export default function WalletNavBar({ openOverlay, didEnabledLrc20 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useThemeContext();
  const { backgroundColor } = useThemeColors();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    await fullRestoreSparkState({
      sparkAddress: sparkInformation.sparkAddress,
      batchSize: 5,
      isSendingPayment: false,
      mnemonic: currentWalletMnemoinc,
      identityPubKey: sparkInformation.identityPubKey,
    });

    setIsRefreshing(false);
    openOverlay({
      for: "error",
      errorMessage: "Your wallet was successfully refreshed.",
    });
  }, []);
  return (
    <div
      style={{ backgroundColor, paddingTop: didEnabledLrc20 ? "20px" : 0 }}
      className="walletNavBar"
    >
      <div className="themeContainer" onClick={() => toggleTheme(!theme)}>
        <ThemeImage
          styles={{ display: theme ? "block" : "none" }}
          icon={lightMode}
        />
        <ThemeImage
          styles={{ display: !theme ? "block" : "none" }}
          icon={darkMode}
        />
      </div>

      <div className="refreshContainer">
        <ThemeImage
          styles={{ width: 23, height: 23 }}
          clickFunction={handleRefresh}
          icon={refresh}
          className={`${isRefreshing ? "spinningAnimation" : ""}`}
        />
      </div>
      <ThemeImage
        clickFunction={() => navigate("/settings")}
        icon={settingsIcon}
      />
    </div>
  );
}
