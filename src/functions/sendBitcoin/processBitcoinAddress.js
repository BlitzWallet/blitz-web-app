import {
  SATSPERBITCOIN,
  SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT,
} from "../../constants";
import { sparkPaymenWrapper } from "../spark/payments";
import { InputTypes } from "bitcoin-address-parser";

export default async function processBitcoinAddress(input, context) {
  const {
    masterInfoObject,
    comingFromAccept,
    enteredPaymentInfo,
    fiatStats,
    paymentInfo,
    currentWalletMnemoinc,
  } = context;

  const bip21AmountSat = input.data.amount * SATSPERBITCOIN;

  const amountSat = comingFromAccept
    ? enteredPaymentInfo.amount
    : bip21AmountSat || 0;

  const fiatValue =
    Number(amountSat) / (SATSPERBITCOIN / (fiatStats?.value || 65000));

  let newPaymentInfo = {
    address: input.data.address,
    amount: amountSat,
    label: input.data.label || "",
    message: input.data.message || "",
  };

  let paymentFee = 0;
  let supportFee = 0;
  let feeQuote;
  if (
    (amountSat && amountSat >= SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT) ||
    (comingFromAccept &&
      (!paymentInfo.paymentFee ||
        !paymentInfo.supportFee ||
        !paymentInfo.feeQuote))
  ) {
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
        address: input.data.address,
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
    type: InputTypes.BITCOIN_ADDRESS,
    paymentNetwork: "Bitcoin",
    address: input.data.address,
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
    canEditPayment:
      comingFromAccept || amountSat > SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT
        ? false
        : true,
  };
}
