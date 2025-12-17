import { useLocation, useNavigate } from "react-router-dom";
import "./nav.css";
import { useCallback, useState } from "react";
import { useSpark } from "../../../../contexts/sparkContext";
import { fullRestoreSparkState } from "../../../../functions/spark/restore";
import { useThemeContext } from "../../../../contexts/themeContext";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useActiveCustodyAccount } from "../../../../contexts/activeAccount";
import { Moon, Sun, RefreshCw, Settings } from "lucide-react";
import NavBarProfileImage from "../../../../components/navBar/profileImage";

export default function WalletNavBar({ openOverlay, didEnabledLrc20 }) {
  const { theme, toggleTheme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset } = useThemeColors();
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
    <div style={{ backgroundColor }} className="walletNavBar">
      <div className="themeContainer" onClick={() => toggleTheme(!theme)}>
        {!theme ? (
          <Moon color="var(--primaryBlue)" size={30} />
        ) : (
          <Sun
            color={`${darkModeType ? "var(--dmt)" : "var(--primaryBlue)"}`}
            size={30}
          />
        )}
      </div>

      <div className="refreshContainer">
        <RefreshCw
          onClick={handleRefresh}
          color={theme && darkModeType ? "var(--dmt)" : "var(--primaryBlue)"}
          size={28}
          className={`${isRefreshing ? "spinningAnimation" : ""}`}
        />
      </div>
      <NavBarProfileImage />
    </div>
  );
}
