import {
  getSparkAddress,
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentFeeEstimate,
  getSparkLightningSendRequest,
  getSparkStaticBitcoinL1Address,
  getSparkTransactions,
  sendSparkBitcoinPayment,
  sendSparkLightningPayment,
  sendSparkPayment,
  sparkWallet,
} from ".";

import {
  SATSPERBITCOIN,
  SPARK_TO_LN_FEE,
  SPARK_TO_SPARK_FEE,
} from "../../constants/math";
import { formatBip21SparkAddress } from "./handleBip21SparkAddress";
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
}) => {
  try {
    console.log("Begining spark payment");
    if (!sparkWallet) throw new Error("sparkWallet not initialized");
    const supportFee =
      Math.ceil(
        amountSats * masterInfoObject?.enabledDeveloperSupport.baseFeePercent
      ) + Number(masterInfoObject?.enabledDeveloperSupport?.baseFee);
    if (getFee) {
      console.log("Calculating spark payment fee");
      let calculatedFee = 0;
      if (paymentType === "lightning") {
        const routingFee = await getSparkLightningPaymentFeeEstimate(address);
        if (!routingFee) throw new Error("Unable to calculate spark fee");
        calculatedFee = routingFee + amountSats * SPARK_TO_LN_FEE;
      } else if (paymentType === "bitcoin") {
        const feeResponse = await sparkWallet.getWithdrawalFeeEstimate({
          amountSats,
          withdrawalAddress: address,
        });
        calculatedFee =
          feeResponse.speedFast.userFee.originalValue +
          feeResponse.speedFast.l1BroadcastFee.originalValue;
      } else {
        // Spark payments
        const feeResponse = await sparkWallet.getSwapFeeEstimate(amountSats);
        calculatedFee =
          feeResponse.feeEstimate.originalValue || SPARK_TO_SPARK_FEE;
      }
      return {
        didWork: true,
        fee: Math.round(calculatedFee),
        supportFee: Math.round(supportFee),
      };
    }
    let response;
    if (userBalance < amountSats + (paymentType === "bitcoin" ? 0 : fee))
      throw new Error("Insufficient funds");

    let supportFeeResponse;

    if (paymentType === "lightning") {
      console.log(address, "testing address");
      const lightningPayResponse = await sendSparkLightningPayment({
        invoice: address,
      });
      if (!lightningPayResponse)
        throw new Error("Error when sending lightning payment");
      handleSupportPayment(masterInfoObject, supportFee);

      // console.log(lightningPayResponse, "lightning pay response");
      // let sparkQueryResponse = null;
      // let count = 0;
      // while (!sparkQueryResponse && count < 5) {
      //   const sparkResponse = await getSparkLightningSendRequest(
      //     lightningPayResponse.id
      //   );

      //   if (sparkResponse?.transfer) {
      //     sparkQueryResponse = sparkResponse;
      //   } else {
      //     console.log("Waiting for response...");
      //     await new Promise((res) => setTimeout(res, 2000));
      //   }
      //   count += 1;
      // }

      // console.log(sparkQueryResponse, "AFTEWR");
      const tx = {
        id: lightningPayResponse.id,
        paymentStatus: "pending",
        paymentType: "lightning",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: fee,
          amount: amountSats,
          address: lightningPayResponse.encodedInvoice,
          time: new Date(lightningPayResponse.updatedAt).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          preimage: "",
        },
      };
      response = tx;

      await bulkUpdateSparkTransactions([tx]);
    } else if (paymentType === "bitcoin") {
      // make sure to import exist speed
      const onChainPayResponse = await sendSparkBitcoinPayment({
        onchainAddress: address,
        exitSpeed,
        amountSats,
      });
      if (!onChainPayResponse)
        throw new Error("Error when sending bitcoin payment");
      handleSupportPayment(masterInfoObject, supportFee);

      console.log(onChainPayResponse, "on-chain pay response");
      let sparkQueryResponse = null;
      let count = 0;
      while (!sparkQueryResponse && count < 5) {
        const sparkResponse = await getSparkBitcoinPaymentRequest(
          onChainPayResponse.id
        );
        if (sparkResponse?.coopExitTxid) {
          sparkQueryResponse = sparkResponse;
        } else {
          console.log("Waiting for response...");
          await new Promise((res) => setTimeout(res, 2000));
        }
        count += 1;
      }

      console.log(
        sparkQueryResponse,
        "on-chain query response after confirmation"
      );
      const tx = {
        id: onChainPayResponse.id,
        paymentStatus: "pending",
        paymentType: "bitcoin",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: fee,
          amount: Math.round(amountSats - fee),
          address: address,
          time: new Date(onChainPayResponse.updatedAt).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          onChainTxid: sparkQueryResponse
            ? sparkQueryResponse.coopExitTxid
            : onChainPayResponse.coopExitTxid,
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx]);
    } else {
      const sparkPayResponse = await sendSparkPayment({
        receiverSparkAddress: address,
        amountSats,
      });

      if (!sparkPayResponse)
        throw new Error("Error when sending spark payment");

      handleSupportPayment(masterInfoObject, supportFee);

      const tx = {
        id: sparkPayResponse.id,
        paymentStatus: "completed",
        paymentType: "spark",
        accountId: sparkPayResponse.senderIdentityPublicKey,
        details: {
          fee: fee,
          amount: amountSats,
          address: address,
          time: new Date(sparkPayResponse.updatedTime).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          senderIdentityPublicKey: sparkPayResponse.receiverIdentityPublicKey,
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx]);
    }
    console.log(response, "resonse in send function");
    return { didWork: true, response };
  } catch (err) {
    console.log("Send lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const sparkReceivePaymentWrapper = async ({
  amountSats,
  memo,
  paymentType,
}) => {
  try {
    if (!sparkWallet) throw new Error("sparkWallet not initialized");

    if (paymentType === "lightning") {
      const invoice = await sparkWallet.createLightningInvoice({
        amountSats,
        memo,
        expirySeconds: 1000 * 60 * 60 * 12, //Add 24 hours validity to invoice
      });

      const tempTransaction = {
        id: invoice.id,
        amount: amountSats,
        expiration: invoice.invoice.expiresAt,
        description: memo || "",
      };
      await addSingleUnpaidSparkLightningTransaction(tempTransaction);
      return {
        didWork: true,
        data: invoice,
        invoice: invoice.invoice.encodedInvoice,
      };
    } else if (paymentType === "bitcoin") {
      // Handle storage of tx when claiming in spark context
      const depositAddress = await getSparkStaticBitcoinL1Address();

      let formmattedAddress = amountSats
        ? `bitcoin:${depositAddress}?amount:${Number(
            amountSats / SATSPERBITCOIN
          ).toFixed(8)}${
            memo
              ? `&label=${encodeURIComponent(memo)}&message${encodeURIComponent(
                  memo
                )}`
              : ""
          }`
        : depositAddress;

      return {
        didWork: true,
        invoice: formmattedAddress,
      };
    } else {
      // No need to save address since it is constant
      const sparkAddress = await getSparkAddress();
      const formattedSparkAddress = formatBip21SparkAddress({
        address: sparkAddress,
        amount: amountSats,
        message: memo,
      });

      let formmattedAddress = amountSats ? formattedSparkAddress : sparkAddress;

      return {
        didWork: true,
        invoice: formmattedAddress,
      };
    }
  } catch (err) {
    console.log("Receive spark payment error", err);
    return { didWork: false, error: err.message };
  }
};

async function handleSupportPayment(masterInfoObject, supportFee) {
  try {
    if (masterInfoObject?.enabledDeveloperSupport?.isEnabled) {
      await sendSparkPayment({
        receiverSparkAddress: import.meta.env.VITE_BLITZ_SPARK_ADDRESS,
        amountSats: supportFee,
      });

      sparkTransactionsEventEmitter.emit(
        SPARK_TX_UPDATE_ENVENT_NAME,
        "supportTx"
      );
    }
  } catch (err) {
    console.log("Error sending support payment", err);
  }
}
