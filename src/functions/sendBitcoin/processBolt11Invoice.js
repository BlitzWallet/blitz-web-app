import { SATSPERBITCOIN } from "../../constants";
import { sparkPaymenWrapper } from "../spark/payments";
import { InputTypes } from "bitcoin-address-parser";

export default async function processBolt11Invoice(input, context) {
  const {
    masterInfoObject,
    comingFromAccept,
    enteredPaymentInfo,
    fiatStats,
    paymentInfo,
    currentWalletMnemoinc,
    t,
  } = context;

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = input.data.timestamp + input.data.expiry;
  const isExpired = currentTime > expirationTime;
  if (isExpired)
    throw new Error(
      t("wallet.sendPages.handlingAddressErrors.expiredLightningInvoice")
    );

  const amountMsat = comingFromAccept
    ? enteredPaymentInfo.amount * 1000
    : input.data.amountMsat || 0;
  const fiatValue =
    !!amountMsat &&
    Number(amountMsat / 1000) / (SATSPERBITCOIN / (fiatStats?.value || 65000));
  let fee = {};
  if (amountMsat) {
    if (paymentInfo.paymentFee && paymentInfo.supportFee) {
      fee = {
        fee: paymentInfo.paymentFee,
        supportFee: paymentInfo.supportFee,
      };
    } else {
      fee = await sparkPaymenWrapper({
        getFee: true,
        address: input.data.address,
        amountSats: Math.round(amountMsat / 1000),
        paymentType: "lightning",
        masterInfoObject,
        mnemonic: currentWalletMnemoinc,
      });

      if (!fee.didWork) throw new Error(fee.error);
    }
  }

  return {
    data: { ...input, message: input.data.description },
    type: InputTypes.BOLT11,
    paymentNetwork: "lightning",
    paymentFee: fee.fee,
    supportFee: fee.supportFee,
    address: input.data.address,
    usingZeroAmountInvoice: !input.data.amountMsat,
    sendAmount: !amountMsat
      ? ""
      : `${
          masterInfoObject.userBalanceDenomination != "fiat"
            ? `${Math.round(amountMsat / 1000)}`
            : fiatValue < 0.01
            ? ""
            : `${fiatValue.toFixed(2)}`
        }`,
    canEditPayment: comingFromAccept ? false : !amountMsat,
  };
}
