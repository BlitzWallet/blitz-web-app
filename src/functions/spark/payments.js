import {
  getSingleTxDetails,
  getSparkAddress,
  getSparkBitcoinPaymentFeeEstimate,
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentFeeEstimate,
  getSparkLightningSendRequest,
  getSparkPaymentFeeEstimate,
  getSparkPaymentStatus,
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
  IS_SPARK_ID,
  IS_SPARK_REQUEST_ID,
  USDB_TOKEN_ID,
} from "../../constants";

import {
  isSendingPayingEventEmiiter,
  SENDING_PAYMENT_EVENT_NAME,
} from "../../contexts/sparkContext";
import sha256Hash from "../hash";
import calculateProgressiveBracketFee from "./calculateSupportFee";
import {
  calculateFlashnetAmountIn,
  dollarsToSats,
  executeSwap,
  getUserSwapHistory,
  payLightningWithToken,
  satsToDollars,
  USD_ASSET_ADDRESS,
} from "./flashnet";
import { setFlashnetTransfer } from "./handleFlashnetTransferIds";
import {
  addSingleUnpaidSparkLightningTransaction,
  bulkUpdateSparkTransactions,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "./transactions";

export const sparkPaymenWrapper = async ({
  getFee = false,
  address = "",
  paymentType,
  amountSats = 0,
  exitSpeed = "FAST",
  masterInfoObject,
  fee,
  memo = "",
  userBalance = 0,
  sparkInformation,
  feeQuote,
  usingZeroAmountInvoice = false,
  seletctedToken = "Bitcoin",
  mnemonic,
  contactInfo,
  fromMainSendScreen = false,
  usablePaymentMethod = "BTC",
  swapPaymentQuote = {},
  paymentInfo = {},
  fiatValueConvertedSendAmount,
  poolInfoRef,
  extraDetails = {},
}) => {
  try {
    console.log("Begining spark payment");
    const sendingUUID =
      contactInfo?.uuid || paymentInfo?.blitzContactInfo?.uuid || "";

    const supportFee = 0;
    if (getFee) {
      console.log("Calculating spark payment fee");
      let calculatedFee = 0;
      let tempFeeQuote;
      if (paymentType === "lightning") {
        const routingFee = await getSparkLightningPaymentFeeEstimate(
          address,
          amountSats,
          mnemonic,
        );
        if (!routingFee.didWork)
          throw new Error(routingFee.error || "Unable to get routing fee");
        calculatedFee = routingFee.response;
      } else if (paymentType === "bitcoin") {
        const feeResponse = await getSparkBitcoinPaymentFeeEstimate({
          amountSats,
          withdrawalAddress: address,
          mnemonic,
        });
        if (!feeResponse.didWork)
          throw new Error(
            feeResponse.error || "Unable to get Bitcoin fee estimation",
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
          mnemonic,
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
    let amountOutSats = amountSats;
    let amountOutMicrodollars;

    isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, true);

    if (paymentType === "lightning") {
      if (usablePaymentMethod === "USD") {
        const swapPaymentResponse = await payLightningWithToken(mnemonic, {
          invoice: address,
          tokenAddress: USD_ASSET_ADDRESS,
        });

        if (!swapPaymentResponse.didWork)
          throw new Error(
            swapPaymentResponse.error ||
              "Error when sending lightning payment from USD balance",
          );

        // delete swap transfer and combine all info into one tx
        setFlashnetTransfer(swapPaymentResponse.result.swapTransferId);

        const [lightningSendResponse, userSwaps] = await Promise.all([
          IS_SPARK_REQUEST_ID.test(
            swapPaymentResponse.result.lightningPaymentId,
          )
            ? getSparkLightningSendRequest(
                swapPaymentResponse.result.lightningPaymentId,
                mnemonic,
              )
            : getSingleTxDetails(
                mnemonic,
                swapPaymentResponse.result.lightningPaymentId,
              ),
          getUserSwapHistory(mnemonic, 5),
        ]);

        if (userSwaps.didWork) {
          const swap = userSwaps.swaps.find(
            (savedSwap) =>
              savedSwap.outboundTransferId ===
              swapPaymentResponse.result.swapTransferId,
          );

          // if swap is found delte from tx history
          if (swap) {
            setFlashnetTransfer(swap.inboundTransferId);
          }
        }

        const didUseLightning = IS_SPARK_REQUEST_ID.test(
          swapPaymentResponse.result.lightningPaymentId,
        );

        const usdToSatFee = dollarsToSats(
          swapPaymentResponse.result.ammFeePaid / 1000000,
          poolInfoRef.currentPriceAInB,
        );
        const lnFee = swapPaymentResponse.result.lightningFeePaid;

        const tx = {
          id: swapPaymentResponse.result.lightningPaymentId,
          paymentStatus: didUseLightning ? "pending" : "completed",
          paymentType: didUseLightning ? "lightning" : "spark",
          accountId: sparkInformation.identityPubKey,
          details: {
            sendingUUID,
            fee: Math.round(usdToSatFee + lnFee),
            totalFee: Math.round(usdToSatFee + lnFee),
            supportFee: 0,
            amount:
              swapPaymentResponse.result.tokenAmountSpent -
              swapPaymentResponse.result.ammFeePaid,
            description: memo || "",
            address: address,
            time: new Date(
              lightningSendResponse[
                didUseLightning ? "updatedAt" : "updatedTime"
              ],
            ).getTime(),
            createdAt: new Date(
              lightningSendResponse[
                didUseLightning ? "createdAt" : "createdTime"
              ],
            ).getTime(),
            direction: "OUTGOING",
            preimage: "",
            isLRC20Payment: true,
            LRC20Token: USDB_TOKEN_ID,
            ...(paymentInfo?.data?.successAction
              ? { successAction: paymentInfo.data.successAction }
              : {}),
            ...(paymentInfo.blitzContactInfo
              ? { remoteContactPayment: paymentInfo.blitzContactInfo }
              : {}),
          },
        };
        response = tx;
      } else {
        const initialFee = Math.round(fee - supportFee);
        const lightningPayResponse = await sendSparkLightningPayment({
          maxFeeSats: Math.max(initialFee, 1000),
          invoice: address,
          amountSats: usingZeroAmountInvoice ? amountSats : undefined,
          mnemonic,
        });

        if (!lightningPayResponse.didWork)
          throw new Error(
            lightningPayResponse.error ||
              "Error when sending lightning payment",
          );

        const data = lightningPayResponse.paymentResponse;

        const paymentType = data?.type ? "spark" : "lightning";

        if (paymentType === "lightning") {
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
              sendingUUID,
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
              ...(paymentInfo?.data?.successAction
                ? { successAction: paymentInfo.data.successAction }
                : {}),
              ...(paymentInfo.blitzContactInfo
                ? { remoteContactPayment: paymentInfo.blitzContactInfo }
                : {}),
            },
          };
          response = tx;
        } else {
          const tx = {
            id: data.id,
            paymentStatus: "completed",
            paymentType: "spark",
            accountId: sparkInformation.identityPubKey,
            details: {
              sendingUUID,
              fee: 0,
              totalFee: 0 + supportFee,
              supportFee: supportFee,
              amount: amountSats,
              address: address,
              time: new Date(data.updatedTime).getTime(),
              direction: "OUTGOING",
              description: memo || "",
              senderIdentityPublicKey: data.receiverIdentityPublicKey,
              isLRC20Payment: false,
              LRC20Token: seletctedToken,
              ...(paymentInfo?.data?.successAction
                ? { successAction: paymentInfo.data.successAction }
                : {}),
              ...(paymentInfo.blitzContactInfo
                ? { remoteContactPayment: paymentInfo.blitzContactInfo }
                : {}),
            },
          };
          response = tx;
        }
      }
    } else if (paymentType === "bitcoin") {
      // make sure to import exist speed

      const feeFromQuote =
        (feeQuote.l1BroadcastFeeFast?.originalValue || 0) +
        (feeQuote.userFeeFast?.originalValue || 0);
      const deductFeeFromAmount =
        (amountSats + feeFromQuote) * 1.1 >= userBalance;

      const onChainPayResponse = await sendSparkBitcoinPayment({
        onchainAddress: address,
        exitSpeed,
        amountSats,
        feeQuote,
        deductFeeFromWithdrawalAmount: deductFeeFromAmount,
        mnemonic,
      });

      if (!onChainPayResponse.didWork)
        throw new Error(
          onChainPayResponse.error || "Error when sending bitcoin payment",
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
    } else {
      let executionResponse;

      const expectedReceiveType = paymentInfo?.data?.expectedReceive || "sats";
      const needsSwap =
        ((usablePaymentMethod === "USD" && expectedReceiveType === "sats") ||
          (usablePaymentMethod === "BTC" &&
            expectedReceiveType === "tokens")) &&
        seletctedToken === "Bitcoin";

      let isSwap = false;
      let usedUSDB = false;

      if (needsSwap) {
        if (usablePaymentMethod === "USD") {
          //add fee here
          const dollarFee = satsToDollars(
            swapPaymentQuote.satFee,
            poolInfoRef.currentPriceAInB,
          );
          const formatted = calculateFlashnetAmountIn({
            baseAmountIn: swapPaymentQuote.amountIn + dollarFee,
            isUsdAssetIn: true,
            dollarBalanceSat: swapPaymentQuote.dollarBalanceSat,
            currentPriceAInB: poolInfoRef.currentPriceAInB,
          });
          executionResponse = await executeSwap(mnemonic, {
            poolId: swapPaymentQuote.poolId,
            assetInAddress: swapPaymentQuote.assetInAddress,
            assetOutAddress: swapPaymentQuote.assetOutAddress,
            amountIn: formatted,
          });
          usedUSDB = true;
        } else {
          const formatted = calculateFlashnetAmountIn({
            baseAmountIn: swapPaymentQuote.amountIn + swapPaymentQuote.satFee,
            isUsdAssetIn: false,
            maxBalance: swapPaymentQuote.bitcoinBalance,
          });
          executionResponse = await executeSwap(mnemonic, {
            poolId: swapPaymentQuote.poolId,
            assetInAddress: swapPaymentQuote.assetInAddress,
            assetOutAddress: swapPaymentQuote.assetOutAddress,
            amountIn: formatted,
          });
        }

        if (!executionResponse.didWork)
          throw new Error(executionResponse.error);

        const outboundTransferId = executionResponse.swap.outboundTransferId;
        setFlashnetTransfer(outboundTransferId);

        const userSwaps = await getUserSwapHistory(mnemonic, 5);

        if (userSwaps.didWork) {
          const swap = userSwaps.swaps.find(
            (savedSwap) => savedSwap.outboundTransferId === outboundTransferId,
          );

          if (swap) {
            setFlashnetTransfer(swap.inboundTransferId);
          }
        }

        const MAX_WAIT_TIME = 60000;
        const startTime = Date.now();

        while (true) {
          if (Date.now() - startTime > MAX_WAIT_TIME) {
            throw new Error("Swap completion timeout");
          }

          if (!IS_SPARK_ID.test(outboundTransferId)) {
            await new Promise((res) => setTimeout(res, 2500));
            break;
          }

          const sparkTransferResponse = await getSingleTxDetails(
            mnemonic,
            outboundTransferId,
          );

          const status = getSparkPaymentStatus(sparkTransferResponse?.status);
          if (status === "completed") break;

          console.log("Swap is not complete, waiting for completion");
          await new Promise((res) => setTimeout(res, 1500));
        }

        isSwap = true;
        // small buffer to help smooth things out
        await new Promise((res) => setTimeout(res, 1500));
      }

      let sparkPayResponse;
      let useLRC20Format = false;
      const maxAttempts = isSwap ? 3 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          await new Promise((res) => setTimeout(res, 3500));
        }

        if (expectedReceiveType === "tokens" && seletctedToken === "Bitcoin") {
          const originalSendAmount =
            satsToDollars(amountSats, poolInfoRef.currentPriceAInB).toFixed(3) *
            Math.pow(10, 6);
          const usdbAmount = isSwap
            ? executionResponse.swap.amountOut >= originalSendAmount
              ? originalSendAmount
              : executionResponse.swap.amountOut
            : fiatValueConvertedSendAmount;
          amountOutMicrodollars = usdbAmount;
          useLRC20Format = true;
          sparkPayResponse = await sendSparkTokens({
            tokenIdentifier: USDB_TOKEN_ID,
            tokenAmount: Number(Math.ceil(usdbAmount)),
            receiverSparkAddress: address,
            mnemonic,
          });
        } else if (seletctedToken !== "Bitcoin") {
          useLRC20Format = true;
          sparkPayResponse = await sendSparkTokens({
            tokenIdentifier: seletctedToken,
            tokenAmount: Number(amountSats),
            receiverSparkAddress: address,
            mnemonic,
          });
        } else {
          const finalSatAmount = isSwap
            ? executionResponse.swap.amountOut >= amountSats
              ? amountSats
              : executionResponse.swap.amountOut
            : amountSats;
          amountOutSats = finalSatAmount;
          sparkPayResponse = await sendSparkPayment({
            receiverSparkAddress: address,
            amountSats: Number(finalSatAmount),
            mnemonic,
          });
        }

        if (sparkPayResponse.didWork) break;

        if (attempt === maxAttempts - 1) {
          throw new Error(
            sparkPayResponse.error || "Error when sending spark payment",
          );
        }
      }

      const data = sparkPayResponse.response;

      const formattedToken =
        seletctedToken !== "Bitcoin"
          ? seletctedToken
          : expectedReceiveType === "tokens"
            ? USDB_TOKEN_ID
            : "";

      const tx = {
        id: useLRC20Format ? data : data.id,
        paymentStatus: "completed",
        paymentType: "spark",
        accountId: sparkInformation.identityPubKey,
        details: {
          sendingUUID,
          fee: 0,
          totalFee: 0 + supportFee,
          supportFee: supportFee,
          amount: amountSats,
          address: address,
          time: useLRC20Format
            ? new Date().getTime()
            : new Date(data.updatedTime).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          senderIdentityPublicKey: useLRC20Format
            ? ""
            : data.receiverIdentityPublicKey,
          isLRC20Payment: useLRC20Format,
          LRC20Token: formattedToken,
          ...(paymentInfo.blitzContactInfo
            ? { remoteContactPayment: paymentInfo.blitzContactInfo }
            : {}),
        },
      };

      if (isSwap) {
        if (usedUSDB) {
          tx.details.isLRC20Payment = true;
          tx.details.LRC20Token = USDB_TOKEN_ID;
          tx.details.fee =
            tx.details.fee +
            dollarsToSats(
              executionResponse.swap.feeAmount / Math.pow(10, 6),
              poolInfoRef.currentPriceAInB,
            );
          tx.details.totalFee = tx.details.fee;

          tx.details.amount = swapPaymentQuote.amountIn;
        } else {
          tx.details.isLRC20Payment = false;
          tx.details.LRC20Token = "";
          tx.details.fee =
            tx.details.fee +
            dollarsToSats(
              executionResponse.swap.feeAmount / Math.pow(10, 6),
              poolInfoRef.currentPriceAInB,
            );
          tx.details.totalFee = tx.details.fee;
          tx.details.amount = amountSats;
        }
      } else if (
        expectedReceiveType === "tokens" &&
        seletctedToken === "Bitcoin"
      ) {
        const usdbAmount = isSwap
          ? executionResponse.swap.amountOut
          : fiatValueConvertedSendAmount;
        tx.details.amount = usdbAmount;
      }

      response = tx;
    }

    console.log(
      response,
      "resonse in send function",
      sparkInformation.identityPubKey,
    );

    if (sparkInformation.identityPubKey) {
      if (extraDetails && Object.keys(extraDetails).length > 0) {
        response = {
          ...response,
          details: { ...response.details, ...extraDetails },
        };
      }
      await bulkUpdateSparkTransactions([response], "paymentWrapperTx", 0);
    }

    return {
      didWork: true,
      response,
      shouldSave: !sparkInformation.identityPubKey,
      amountOutSats,
      amountOutMicrodollars,
    };
  } catch (err) {
    console.log("Send lightning payment error", err);
    return { didWork: false, error: err.message };
  } finally {
    if (
      !getFee &&
      (!fromMainSendScreen || // not the main send screen → fire always
        sparkInformation?.identityPubKey) // on main send → only fire if identityPubKey exists
    ) {
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
  performSwaptoUSD = false,
  includeSparkAddress = true,
  expirySeconds,
  isHoldInvoice = false,
  paymentHash,
  holdExpirySeconds,
  encryptedPreimage,
}) => {
  try {
    if (!sparkWallet[sha256Hash(mnemoinc)])
      throw new Error("sparkWallet not initialized");

    if (paymentType === "lightning") {
      const invoiceResponse = await receiveSparkLightningPayment({
        amountSats,
        memo,
        mnemonic: mnemoinc,
        includeSparkAddress,
        expirySeconds,
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
          performSwaptoUSD,
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
