import { useLocation, useNavigate } from "react-router-dom";
import SettingsIcon from "../../../../assets/settings.png";
import SettingsIconWhite from "../../../../assets/settingsWhite.png";
import darkMode from "../../../../assets/darkMode.png";
import lightMode from "../../../../assets/lightMode.png";
import lightModeWhite from "../../../../assets/lightModeWhite.png";
import refresh from "../../../../assets/refresh.png";
import refreshWhite from "../../../../assets/refreshWhite.png";
import "./nav.css";
import { useCallback, useState } from "react";
import { useSpark } from "../../../../contexts/sparkContext";
import { getSparkBalance } from "../../../../functions/spark";
import { fullRestoreSparkState } from "../../../../functions/spark/restore";
import { getAllSparkTransactions } from "../../../../functions/spark/transactions";
import { useThemeContext } from "../../../../contexts/themeContext";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function WalletNavBar({ openOverlay }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useThemeContext();
  const { backgroundColor } = useThemeColors();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setSparkInformation, sparkInformation } = useSpark();
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fullRestoreSparkState({
      sparkAddress: sparkInformation.sparkAddress,
    });
    const balance = await getSparkBalance();
    const txs = await getAllSparkTransactions();
    setSparkInformation((prev) => ({
      ...prev,
      balance: Number(balance?.balance) || prev.balance,
      transactions: txs || prev.transactions,
    }));
    setIsRefreshing(false);
    openOverlay({
      for: "error",
      errorMessage: "Your wallet was successfully refreshed.",
    });
  }, []);
  return (
    <div style={{ backgroundColor }} className="walletNavBar">
      <ThemeImage
        clickFunction={() => toggleTheme(!theme)}
        lightModeIcon={darkMode}
        darkModeIcon={lightMode}
        lightsOutIcon={lightModeWhite}
      />

      <div className="refreshContainer">
        <ThemeImage
          styles={{ width: 23, height: 23 }}
          clickFunction={handleRefresh}
          lightModeIcon={refresh}
          darkModeIcon={refresh}
          lightsOutIcon={refreshWhite}
          className={`${isRefreshing ? "spinningAnimation" : ""}`}
        />
      </div>
      <ThemeImage
        clickFunction={() => navigate("/settings")}
        lightModeIcon={SettingsIcon}
        darkModeIcon={SettingsIcon}
        lightsOutIcon={SettingsIconWhite}
      />
    </div>
  );
}
