import { useLocation, useNavigate } from "react-router-dom";
import "./nav.css";
import { useCallback, useState } from "react";
import { useSpark } from "../../../../contexts/sparkContext";
import { fullRestoreSparkState } from "../../../../functions/spark/restore";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useActiveCustodyAccount } from "../../../../contexts/activeAccount";
import { Moon, Sun, RefreshCw, Settings } from "lucide-react";
import NavBarProfileImage from "../../../../components/navBar/profileImage";
import { useOverlay } from "../../../../contexts/overlayContext";
import {
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "../../../../functions/spark/transactions";

export default function WalletNavBar({ didEnabledLrc20 }) {
  const { theme, toggleTheme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { sparkInformation, isSendingPaymentRef } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const response = await fullRestoreSparkState({
        sparkAddress: sparkInformation.sparkAddress,
        batchSize: 2,
        isSendingPayment: isSendingPaymentRef.current,
        mnemonic: currentWalletMnemoinc,
        identityPubKey: sparkInformation.identityPubKey,
        isInitialRestore: false,
      });
      if (!response) {
        sparkTransactionsEventEmitter.emit(
          SPARK_TX_UPDATE_ENVENT_NAME,
          "fullUpdate"
        );
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [sparkInformation, currentWalletMnemoinc]);
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
