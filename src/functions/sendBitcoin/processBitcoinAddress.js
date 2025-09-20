import { SATSPERBITCOIN } from "../../constants";
import { sparkPaymenWrapper } from "../spark/payments";

export default async function processBitcoinAddress(input, context) {
  const {
    masterInfoObject,
    comingFromAccept,
    enteredPaymentInfo,
    fiatStats,
    paymentInfo,
    currentWalletMnemoinc,
  } = context;

  const amountSat = comingFromAccept
    ? enteredPaymentInfo.amount
    : input.address.amountSat || 0;

  const fiatValue =
    Number(amountSat) / (SATSPERBITCOIN / (fiatStats?.value || 65000));
  let newPaymentInfo = {
    address: input.address.address,
    amount: amountSat,
    label: input.address.label || "",
  };
  let paymentFee = 0;
  let supportFee = 0;
  let feeQuote;
  if (amountSat) {
    if (
      paymentInfo.paymentFee &&
      paymentInfo.supportFee &&
      paymentInfo.feeQuote
    ) {
      paymentFee = paymentInfo.paymentFee;
      supportFee = paymentInfo.supportFee;
      feeQuote = paymentInfo.feeQuote;
    } else {
      const paymentFeeResponse = await sparkPaymenWrapper({
        getFee: true,
        address: input.address.address,
        paymentType: "bitcoin",
        amountSats: amountSat,
        masterInfoObject,
        mnemonic: currentWalletMnemoinc,
      });

      if (!paymentFeeResponse.didWork)
        throw new Error(paymentFeeResponse.error);

      paymentFee = paymentFeeResponse.fee;
      supportFee = paymentFeeResponse.supportFee;
      feeQuote = paymentFeeResponse.feeQuote;
    }
  }

  return {
    data: newPaymentInfo,
    type: "Bitcoin",
    paymentNetwork: "Bitcoin",
    address: input.address.address,
    paymentFee: paymentFee,
    supportFee: supportFee,
    feeQuote,
    sendAmount: !amountSat
      ? ""
      : `${
          masterInfoObject.userBalanceDenomination != "fiat"
            ? `${amountSat}`
            : fiatValue < 0.01
            ? ""
            : `${fiatValue.toFixed(2)}`
        }`,
    canEditPayment: comingFromAccept || input.address.amountSat ? false : true,
  };
}
