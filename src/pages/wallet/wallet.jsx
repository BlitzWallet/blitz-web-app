import { useEffect } from "react";
import TransactionContanier from "../../components/transactionContainer/transactionContianer";
import { useAppStatus } from "../../contexts/appStatus";
import UserBalance from "./components/balanceContainer/userBalanceContainer";
import WalletNavBar from "./components/nav/nav";
import SendAndRequestBtns from "./components/sendAndRequestBTNS/sendAndRequstBtns";
import "./wallet.css";

export default function WalletHome({ openOverlay }) {
  const { toggleDidGetToHomepage } = useAppStatus();

  useEffect(() => {
    toggleDidGetToHomepage(true);
  }, []);
  return (
    <div id="walletHomeContainer">
      <WalletNavBar openOverlay={openOverlay} />
      <UserBalance />
      <SendAndRequestBtns openOverlay={openOverlay} />
      <TransactionContanier frompage={"home"} />
    </div>
  );
}
