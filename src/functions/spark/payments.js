import {
  getSparkAddress,
  getSparkBitcoinPaymentFeeEstimate,
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentFeeEstimate,
  getSparkLightningSendRequest,
  getSparkPaymentFeeEstimate,
  getSparkStaticBitcoinL1Address,
  getSparkTransactions,
  receiveSparkLightningPayment,
  sendSparkBitcoinPayment,
  sendSparkLightningPayment,
  sendSparkPayment,
  sendSparkTokens,
  sparkWallet,
} from ".";

import {
  isSendingPayingEventEmiiter,
  SENDING_PAYMENT_EVENT_NAME,
} from "../../contexts/sparkContext";
import sha256Hash from "../hash";
import calculateProgressiveBracketFee from "./calculateSupportFee";
import {
  addSingleUnpaidSparkLightningTransaction,
  bulkUpdateSparkTransactions,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "./transactions";

export const sparkPaymenWrapper = async ({
  getFee = false,
  address,
  paymentType,
  amountSats = 0,
  exitSpeed = "FAST",
  masterInfoObject,
  fee,
  memo,
  userBalance = 0,
  sparkInformation,
  feeQuote,
  usingZeroAmountInvoice = false,
  seletctedToken = "Bitcoin",
  mnemonic,
}) => {
  try {
    console.log("Begining spark payment");
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const supportFee = await calculateProgressiveBracketFee(
      amountSats,
      paymentType,
      mnemonic
    );
    if (getFee) {
      console.log("Calculating spark payment fee");
      let calculatedFee = 0;
      let tempFeeQuote;
      if (paymentType === "lightning") {
        const routingFee = await getSparkLightningPaymentFeeEstimate(
          address,
          amountSats,
          mnemonic
        );
        if (!routingFee.didWork)
          throw new Error(routingFee.error || "Unable to get routing fee");
        calculatedFee = Math.ceil(routingFee.response * 1.5);
      } else if (paymentType === "bitcoin") {
        const feeResponse = await getSparkBitcoinPaymentFeeEstimate({
          amountSats,
          withdrawalAddress: address,
          mnemonic,
        });
        if (!feeResponse.didWork)
          throw new Error(
            feeResponse.error || "Unable to get Bitcoin fee estimation"
          );
        const data = feeResponse.response;
        calculatedFee =
          data.userFeeFast.originalValue +
          data.l1BroadcastFeeFast.originalValue;
        tempFeeQuote = data;
      } else if (paymentType === "lrc20") {
        calculatedFee = 0;
      } else {
        // Spark payments
        const feeResponse = await getSparkPaymentFeeEstimate(
          amountSats,
          mnemonic
        );
        calculatedFee = feeResponse;
      }
      return {
        didWork: true,
        fee: Math.round(calculatedFee),
        supportFee: Math.round(supportFee),
        feeQuote: tempFeeQuote,
      };
    }
    let response;
    if (
      seletctedToken === "Bitcoin" &&
      userBalance < amountSats + (paymentType === "bitcoin" ? supportFee : fee)
    )
      throw new Error("Insufficient funds");

    isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, true);

    if (paymentType === "lightning") {
      const initialFee = Math.round(fee - supportFee);
      const lightningPayResponse = await sendSparkLightningPayment({
        maxFeeSats: Math.ceil(initialFee * 1.5), //addding 50% buffer so we dont undershoot it
        invoice: address,
        amountSats: usingZeroAmountInvoice ? amountSats : undefined,
        mnemonic,
      });
      handleSupportPayment(masterInfoObject, supportFee, mnemonic);
      if (!lightningPayResponse.didWork)
        throw new Error(
          lightningPayResponse.error || "Error when sending lightning payment"
        );

      const data = lightningPayResponse.paymentResponse;

      const realPaymentFee = data?.fee?.originalValue
        ? data?.fee?.originalValue /
          (data?.fee?.originalUnit === "MILLISATOSHI" ? 1000 : 1)
        : initialFee;

      const tx = {
        id: data.id,
        paymentStatus: "pending",
        paymentType: "lightning",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: realPaymentFee,
          totalFee: supportFee + realPaymentFee,
          supportFee: supportFee,
          amount: amountSats,
          description: memo || "",
          address: address,
          time: new Date(data.updatedAt).getTime(),
          createdAt: new Date(data.createdAt).getTime(),
          direction: "OUTGOING",
          preimage: "",
        },
      };
      response = tx;

      await bulkUpdateSparkTransactions(
        [tx],
        "paymentWrapperTx",
        realPaymentFee
      );
    } else if (paymentType === "bitcoin") {
      // make sure to import exist speed
      const onChainPayResponse = await sendSparkBitcoinPayment({
        onchainAddress: address,
        exitSpeed,
        amountSats,
        feeQuote,
        deductFeeFromWithdrawalAmount: true,
        mnemonic,
      });
      handleSupportPayment(masterInfoObject, supportFee, mnemonic);
      if (!onChainPayResponse.didWork)
        throw new Error(
          onChainPayResponse.error || "Error when sending bitcoin payment"
        );

      console.log(onChainPayResponse, "on-chain pay response");
      const data = onChainPayResponse.response;

      const tx = {
        id: data.id,
        paymentStatus: "pending",
        paymentType: "bitcoin",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: fee,
          totalFee: supportFee + fee,
          supportFee: supportFee,
          amount: amountSats,
          address: address,
          time: new Date(data.updatedAt).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          onChainTxid: data.coopExitTxid || "",
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", fee);
    } else {
      let sparkPayResponse;

      if (seletctedToken !== "Bitcoin") {
        sparkPayResponse = await sendSparkTokens({
          tokenIdentifier: seletctedToken,
          tokenAmount: amountSats,
          receiverSparkAddress: address,
          mnemonic,
        });
      } else {
        sparkPayResponse = await sendSparkPayment({
          receiverSparkAddress: address,
          amountSats,
          mnemonic,
        });
      }

      handleSupportPayment(masterInfoObject, supportFee, mnemonic);

      if (!sparkPayResponse.didWork)
        throw new Error(
          sparkPayResponse.error || "Error when sending spark payment"
        );

      const data = sparkPayResponse.response;
      const tx = {
        id: seletctedToken !== "Bitcoin" ? data : data.id,
        paymentStatus: "completed",
        paymentType: "spark",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: 0,
          totalFee: 0 + supportFee,
          supportFee: supportFee,
          amount: amountSats,
          address: address,
          time:
            seletctedToken !== "Bitcoin"
              ? new Date().getTime()
              : new Date(data.updatedTime).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          senderIdentityPublicKey:
            seletctedToken !== "Bitcoin" ? "" : data.receiverIdentityPublicKey,
          isLRC20Payment: seletctedToken !== "Bitcoin",
          LRC20Token: seletctedToken,
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", 0);
    }
    console.log(response, "resonse in send function");
    return { didWork: true, response };
  } catch (err) {
    console.log("Send lightning payment error", err);
    return { didWork: false, error: err.message };
  } finally {
    if (!getFee) {
      isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, false);
    }
  }
};

export const sparkReceivePaymentWrapper = async ({
  amountSats,
  memo,
  paymentType,
  shouldNavigate,
  mnemoinc,
}) => {
  try {
    if (!sparkWallet[sha256Hash(mnemoinc)])
      throw new Error("sparkWallet not initialized");

    if (paymentType === "lightning") {
      const invoiceResponse = await receiveSparkLightningPayment({
        amountSats,
        memo,
        mnemonic: mnemoinc,
      });

      if (!invoiceResponse.didWork) throw new Error(invoiceResponse.error);
      const invoice = invoiceResponse.response;

      const tempTransaction = {
        id: invoice.id,
        amount: amountSats,
        expiration: invoice.invoice.expiresAt,
        description: memo || "",
        shouldNavigate,
        details: {
          createdTime: new Date(invoice.createdAt).getTime(),
          isLNURL: false,
          shouldNavigate: true,
          isBlitzContactPayment: false,
        },
      };
      await addSingleUnpaidSparkLightningTransaction(tempTransaction);
      return {
        didWork: true,
        data: invoice,
        invoice: invoice.invoice.encodedInvoice,
      };
    } else if (paymentType === "bitcoin") {
      // Handle storage of tx when claiming in spark context
      const depositAddress = await getSparkStaticBitcoinL1Address(mnemoinc);
      return {
        didWork: true,
        invoice: depositAddress,
      };
    } else {
      // No need to save address since it is constant
      const sparkAddress = await getSparkAddress(mnemoinc);
      if (!sparkAddress.didWork) throw new Error(sparkAddress.error);

      const data = sparkAddress.response;

      return {
        didWork: true,
        invoice: data,
      };
    }
  } catch (err) {
    console.log("Receive spark payment error", err);
    return { didWork: false, error: err.message };
  }
};

async function handleSupportPayment(masterInfoObject, supportFee, mnemonic) {
  try {
    if (masterInfoObject?.enabledDeveloperSupport?.isEnabled) {
      // await new Promise((res) => setTimeout(res, 2000));
      // await sendSparkPayment({
      //   receiverSparkAddress: import.meta.env.VITE_BLITZ_SPARK_ADDRESS,
      //   amountSats: supportFee,
      //   mnemonic: mnemonic,
      // });
      // sparkTransactionsEventEmitter.emit(
      //   SPARK_TX_UPDATE_ENVENT_NAME,
      //   "supportTx"
      // );
    }
  } catch (err) {
    console.log("Error sending support payment", err);
  }
}
