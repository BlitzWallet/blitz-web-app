import { useLocation, useNavigate } from "react-router-dom";
import BackArrow from "../../components/backArrow/backArrow";
import ThemeText from "../../components/themeText/themeText";
import copyToClipboard from "../../functions/copyToClipboard";
import "./style.css";
import { useOverlay } from "../../contexts/overlayContext";
export default function TechnicalDetailsPage() {
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const navigate = useNavigate();
  const props = location.state;
  const transaction = props?.transaction;
  const { details, sparkID } = transaction;
  const paymentDetails =
    transaction.paymentType === "spark"
      ? ["Payment Id", "Sender Public Key", "Payment Address"]
      : transaction.paymentType === "lightning"
      ? ["Payment Id", "Payment Preimage", "Payment Address"]
      : ["Payment Id", "Bitcoin Txid", "Payment Address"];

  const infoElements = paymentDetails.map((item, id) => {
    const txItem =
      transaction.paymentType === "spark"
        ? id === 0
          ? sparkID
          : id === 1
          ? details.senderIdentityPublicKey
          : details.address
        : transaction.paymentType === "lightning"
        ? id === 0
          ? sparkID
          : id === 1
          ? details.preimage
          : details.address
        : id === 0
        ? sparkID
        : id === 1
        ? details.onChainTxid
        : details.address;

    return (
      <div key={id}>
        <ThemeText textStyles={{ fontWeight: "500" }} textContent={item} />
        <div
          className="itemContainer"
          onClick={() => {
            copyToClipboard(txItem, openOverlay, location);
          }}
        >
          <ThemeText textContent={txItem || "N/A"} />
        </div>
      </div>
    );
  });

  return (
    <>
      <BackArrow backFunction={() => navigate(-1)} />
      <div id="technicalDetailsComponent">{infoElements}</div>
    </>
  );
}
