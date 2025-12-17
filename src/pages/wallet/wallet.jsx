import { useEffect } from "react";
import TransactionContanier from "../../components/transactionContainer/transactionContianer";
import { useAppStatus } from "../../contexts/appStatus";
import UserBalance from "./components/balanceContainer/userBalanceContainer";
import WalletNavBar from "./components/nav/nav";
import SendAndRequestBtns from "./components/sendAndRequestBTNS/sendAndRequstBtns";
import "./wallet.css";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import useThemeColors from "../../hooks/useThemeColors";
import SafeAreaComponent from "../../components/safeAreaContainer";
import LRC20Assets from "./components/lrc20Assets";

export default function WalletHome({ openOverlay }) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const { toggleDidGetToHomepage } = useAppStatus();
  const { textColor } = useThemeColors();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;

  useEffect(() => {
    toggleDidGetToHomepage(true);
  }, []);
  console.log(masterInfoObject);
  return (
    <SafeAreaComponent
      backgroundColor={didEnabledLrc20 ? backgroundOffset : "transparent"}
      customStyles={{ paddingTop: 0, width: "100%" }}
    >
      <div id="walletHomeContainer">
        <div
          style={{
            backgroundColor: didEnabledLrc20 ? backgroundColor : "transparent",
          }}
          className="lrc20Overlay"
        >
          <WalletNavBar
            didEnabledLrc20={didEnabledLrc20}
            openOverlay={openOverlay}
          />
          <UserBalance />
          <SendAndRequestBtns openOverlay={openOverlay} />
          {didEnabledLrc20 && <LRC20Assets openOverlay={openOverlay} />}
        </div>

        <div style={{ background: backgroundOffset }} className="txsContainer">
          <p style={{ color: textColor }} className="header">
            Recent activity
          </p>
          <TransactionContanier frompage={"home"} />
        </div>
      </div>
    </SafeAreaComponent>
  );
}
