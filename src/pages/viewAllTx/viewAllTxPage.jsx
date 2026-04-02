import PageNavBar from "../../components/navBar/navBar";
import TransactionContanier from "../../components/transactionContainer/transactionContianer";

export default function ViewAllTxsPage() {
  return (
    <div className="viewAllTxPage">
      <PageNavBar text="Transactions" />
      <TransactionContanier frompage={"viewAllTx"} />
    </div>
  );
}
