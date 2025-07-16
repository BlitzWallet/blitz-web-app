import { useLocation, useNavigate } from "react-router-dom";
import SettingsIcon from "../../../../assets/settings.png";
import refresh from "../../../../assets/refresh.png";
import "./nav.css";
import { useCallback, useState } from "react";
import { useSpark } from "../../../../contexts/sparkContext";
import { getSparkBalance } from "../../../../functions/spark";
import { fullRestoreSparkState } from "../../../../functions/spark/restore";
import { getAllSparkTransactions } from "../../../../functions/spark/transactions";

export default function WalletNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
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
    navigate("/error", {
      state: {
        errorMessage: "Spark successfully refreshed.",
        background: location,
      },
    });
  }, []);
  return (
    <div className="walletNavBar">
      <div></div>

      <div className="refreshContainer">
        <img
          className={`${isRefreshing ? "spinningAnimation" : ""}`}
          onClick={handleRefresh}
          src={refresh}
        />
      </div>
      <img onClick={() => navigate("/settings")} src={SettingsIcon} />
    </div>
  );
}
