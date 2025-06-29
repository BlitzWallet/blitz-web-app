import {
  BITCOIN_SAT_TEXT,
  BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
} from "../../constants";
import { getLiquidSdk } from "../connectToLiquid.js";

export async function breezLiquidReceivePaymentWrapper({
  sendAmount,
  paymentType,
  description,
}) {
  try {
    const sdk = getLiquidSdk();

    console.log("Starting prepare receive payment process");
    // Set the amount you wish the payer to send via lightning, which should be within the above limits

    let optionalAmount;
    if (paymentType === "liquid" && !sendAmount) {
      optionalAmount = undefined;
    } else {
      optionalAmount = {
        type: "bitcoin",
        payerAmountSat: sendAmount,
      };
    }

    // lightning`, `bolt11Invoice`, `bolt12Offer`, `bitcoinAddress`, `liquidAddress`
    const prepareResponse = await sdk.prepareReceivePayment({
      paymentMethod:
        paymentType === "lightning"
          ? "lightning"
          : paymentType === "liquid"
          ? "liquidAddress"
          : "bitcoinAddress",
      amount: optionalAmount,
    });

    // If the fees are acceptable, continue to create the Receive Payment
    const receiveFeesSat = prepareResponse.feesSat;
    console.log(`Fees: ${receiveFeesSat} ${BITCOIN_SAT_TEXT}`);
    console.log("Starting receive payment");

    const res = await sdk.receivePayment({
      prepareResponse,
      description: description || BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
    });

    const destination = res.destination;
    return { destination, receiveFeesSat };
  } catch (err) {
    console.log(err);

    return false;
  }
}
export async function breezLiquidPaymentWrapper({
  paymentType,
  sendAmount,
  invoice,
  shouldDrain,
}) {
  try {
    const sdk = getLiquidSdk();
    let optionalAmount;

    if (paymentType === "bolt12") {
      optionalAmount = {
        type: "bitcoin",
        receiverAmountSat: sendAmount,
      };
    } else if (paymentType === "bip21Liquid" && shouldDrain) {
      optionalAmount = {
        type: "drain",
      };
    } else optionalAmount = undefined;

    console.log("Starting prepare send payment process");
    const prepareResponse = await sdk.prepareSendPayment({
      destination: invoice,
      amount: optionalAmount ? optionalAmount : undefined,
    });

    // If the fees are acceptable, continue to create the Send Payment
    const sendFeesSat = prepareResponse.feesSat;
    console.log(`Fees: ${sendFeesSat} sat`);
    console.log("Sending payment");
    const sendResponse = await sdk.sendPayment({
      prepareResponse,
    });

    const payment = sendResponse.payment;
    return { payment, fee: sendFeesSat, didWork: true };
  } catch (err) {
    console.log(err);

    return { error: err, didWork: false };
  }
}

export async function breezLiquidLNAddressPaymentWrapper({
  sendAmountSat,
  description,
  paymentInfo,
  shouldDrain,
}) {
  try {
    const sdk = getLiquidSdk();
    const optionalComment = description;
    const optionalValidateSuccessActionUrl = true;
    console.log("Starting prepare LNURL pay payment process");

    let amount;
    if (shouldDrain) {
      amount = {
        type: "drain",
      };
    } else
      amount = {
        type: "bitcoin",
        receiverAmountSat: sendAmountSat,
      };

    const prepareResponse = await sdk.prepareLnurlPay({
      data: paymentInfo,
      amount,
      comment: optionalComment,
      validateSuccessActionUrl: optionalValidateSuccessActionUrl,
    });
    const feesSat = prepareResponse.feesSat;
    console.log(`Fees: ${feesSat} sat`);
    console.log("Sending LNURL pay");
    const result = await sdk.lnurlPay({
      prepareResponse,
    });
    const payment = result.data.payment;
    return { payment, fee: feesSat, didWork: true };
  } catch (err) {
    console.log(err, "BREEZ LIQUID TO LN ADDRESS PAYMENT WRAPPER");
    return { error: err, didWork: false };
  }
}
