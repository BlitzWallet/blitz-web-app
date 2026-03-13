import {
  BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
  GENERATED_BITCOIN_ADDRESSES,
  SATSPERBITCOIN,
} from "../../constants";
import { breezLiquidReceivePaymentWrapper } from "../breezLiquid";

import customUUID from "../customUUID";
import sha256Hash from "../hash";
import { encodeLNURL } from "../lnurl/bench32Formmater";
import Storage from "../localStorage";
import {
  BTC_ASSET_ADDRESS,
  dollarsToSats,
  simulateSwap,
  USD_ASSET_ADDRESS,
} from "../spark/flashnet";
import { sparkReceivePaymentWrapper } from "../spark/payments";

let invoiceTracker = [];

function isCurrentRequest(currentID) {
  return invoiceTracker[invoiceTracker.length - 1]?.id === currentID;
}

function updateRetryCount(requestID, retryCount) {
  const request = invoiceTracker.find((item) => item.id === requestID);
  if (request) {
    request.retryCount = retryCount;
  }
}

export async function initializeAddressProcess(wolletInfo) {
  const {
    setAddressState,
    selectedRecieveOption,
    globalContactsInformation,
    isUsingAltAccount,
  } = wolletInfo;

  const requestUUID = wolletInfo.requestUUID || customUUID();
  const retryCount = wolletInfo.retryCount || 0;
  const startTime = wolletInfo.requestTimeStart || Date.now();

  if (!wolletInfo.requestUUID) {
    invoiceTracker.push({
      id: requestUUID,
      startTime: startTime,
      retryCount: 0,
    });
  }

  let stateTracker = {};
  let hasGlobalError = false;
  let shouldRetry = false;
  try {
    setAddressState((prev) => {
      return {
        ...prev,
        isGeneratingInvoice: true,
        generatedAddress: "",
        errorMessageText: {
          type: null,
          text: "",
        },
        swapPegInfo: {},
        isReceivingSwap: false,
        hasGlobalError: false,
      };
    });
    wolletInfo.setInitialSendAmount(0);

    if (selectedRecieveOption.toLowerCase() === "lightning") {
      const userAmount =
        wolletInfo.endReceiveType === "BTC"
          ? wolletInfo.receivingAmount
          : Math.max(
              wolletInfo.receivingAmount,
              wolletInfo.swapLimits?.bitcoin,
            );

      const realAmount =
        wolletInfo.endReceiveType === "BTC"
          ? userAmount
          : userAmount === 1030 && !wolletInfo.receivingAmount
            ? dollarsToSats(1, wolletInfo.poolInfoRef?.currentPriceAInB)
            : userAmount;

      const randomSats =
        wolletInfo.endReceiveType === "USD"
          ? Math.floor(Math.random() * 10) + 1
          : 0;

      const uniqueAmount = Number(realAmount) + randomSats;

      wolletInfo.setInitialSendAmount(realAmount);

      const swapAmountWithFee = Math.round(
        uniqueAmount *
          ((wolletInfo.poolInfoRef.lpFeeBps + 100 + 10000) / 10000),
      );

      const [response, swapResponse] = await Promise.all([
        sparkReceivePaymentWrapper({
          paymentType: "lightning",
          amountSats:
            wolletInfo.endReceiveType === "USD"
              ? swapAmountWithFee
              : uniqueAmount,
          memo: wolletInfo.description,
          mnemoinc: wolletInfo.currentWalletMnemoinc,
          performSwaptoUSD: wolletInfo.endReceiveType === "USD",
          expirySeconds: wolletInfo.endReceiveType === "USD" ? 600 : undefined,
          includeSparkAddress: wolletInfo.endReceiveType !== "USD",
        }),
        wolletInfo.endReceiveType === "USD"
          ? simulateSwap(wolletInfo.currentWalletMnemoinc, {
              poolId: wolletInfo.poolInfoRef.lpPublicKey,
              assetInAddress: BTC_ASSET_ADDRESS,
              assetOutAddress: USD_ASSET_ADDRESS,
              amountIn: swapAmountWithFee,
            })
          : Promise.resolve(null),
      ]);

      if (!response.didWork) {
        throw new Error("errormessages.lightningInvoiceError");
      }

      stateTracker = {
        generatedAddress: response.invoice,
        fee: 0,
      };

      if (swapResponse && swapResponse?.didWork) {
        stateTracker.swapResponse = swapResponse.simulation;
        const showPriceImpact =
          parseFloat(swapResponse.simulation.priceImpact) > 5;
        if (showPriceImpact) {
          stateTracker.errorMessageText = {
            type: "warning",
            text: "errormessages.priceImpact",
          };
        }
      }

      // stateTracker = response
    } else if (selectedRecieveOption.toLowerCase() === "bitcoin") {
      let address = "";
      const walletHash = sha256Hash(wolletInfo.currentWalletMnemoinc);

      let storedBitcoinAddress = Storage.getItem(GENERATED_BITCOIN_ADDRESSES);

      if (!storedBitcoinAddress) {
        storedBitcoinAddress = {};
      }

      if (storedBitcoinAddress[walletHash]) {
        address = storedBitcoinAddress[walletHash];
      } else {
        const response = await sparkReceivePaymentWrapper({
          paymentType: "bitcoin",
          amountSats: wolletInfo.receivingAmount,
          memo: wolletInfo.description,
          mnemoinc: wolletInfo.currentWalletMnemoinc,
        });

        if (!response.didWork) {
          throw new Error("errormessages.bitcoinInvoiceError");
        }

        storedBitcoinAddress[walletHash] = response.invoice;
        address = response.invoice;
        Storage.setItem(GENERATED_BITCOIN_ADDRESSES, storedBitcoinAddress);
      }

      stateTracker = {
        generatedAddress:
          wolletInfo.receivingAmount || wolletInfo.description
            ? formatBip21Address({
                address: address,
                amountSat: wolletInfo.receivingAmount
                  ? (wolletInfo.receivingAmount / SATSPERBITCOIN).toFixed(8)
                  : undefined,
                message: wolletInfo.description,
                prefix: "bitcoin",
              })
            : address,
        fee: 0,
      };
      // stateTracker = response;
    } else if (selectedRecieveOption.toLowerCase() === "spark") {
      let sparkAddress = "";
      if (wolletInfo.endReceiveType === "BTC") {
        if (wolletInfo.sparkInformation.sparkAddress) {
          sparkAddress = wolletInfo.sparkInformation.sparkAddress;
        } else {
          const response = await sparkReceivePaymentWrapper({
            paymentType: "spark",
            amountSats: wolletInfo.receivingAmount,
            memo: wolletInfo.description,
            mnemoinc: wolletInfo.currentWalletMnemoinc,
          });

          if (!response.didWork) {
            throw new Error("errormessages.sparkInvoiceError");
          }

          sparkAddress = response.invoice;
        }
      } else {
        const response = await createTokensInvoice(
          wolletInfo.currentWalletMnemoinc,
        );
        if (!response.didWork) {
          throw new Error("errormessages.sparkInvoiceError");
        }

        sparkAddress = response.invoice;
      }

      stateTracker = {
        generatedAddress: sparkAddress,
        fee: 0,
      };
    } else {
      const response = await generateLiquidAddress(wolletInfo);
      if (!response) throw new Error("Error with Liquid");
      stateTracker = response;
    }
  } catch (error) {
    console.log(error, "HANDLING ERROR");
    const elapsedTime = Date.now() - startTime;

    if (
      isCurrentRequest(requestUUID) &&
      retryCount < 1 &&
      elapsedTime < 10000
    ) {
      await new Promise((res) => setTimeout(res, 2000));
      console.log(`Retrying request ${requestUUID} after ${elapsedTime}ms`);

      updateRetryCount(requestUUID, retryCount + 1);

      shouldRetry = true;

      initializeAddressProcess({
        ...wolletInfo,
        retryCount: retryCount + 1,
        requestUUID: requestUUID,
        requestTimeStart: startTime,
      });

      return;
    }

    stateTracker = {
      generatedAddress: null,
      errorMessageText: {
        type: "stop",
        text: error.message,
      },
    };
  } finally {
    if (invoiceTracker.length > 3) invoiceTracker = [invoiceTracker.pop()];

    if (!isCurrentRequest(requestUUID) || shouldRetry) {
      return;
    }

    if (hasGlobalError) {
      setAddressState((prev) => ({
        ...prev,
        hasGlobalError: true,
        isGeneratingInvoice: false,
      }));
    } else {
      setAddressState((prev) => ({
        ...prev,
        ...stateTracker,
        isGeneratingInvoice: false,
      }));
    }
  }
}

export async function generateLiquidAddress(wolletInfo) {
  const { receivingAmount, setAddressState, description } = wolletInfo;

  const addressResponse = await breezLiquidReceivePaymentWrapper({
    sendAmount: receivingAmount,
    paymentType: "liquid",
    description: description || BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
  });
  if (!addressResponse) {
    return {
      generatedAddress: null,
      errorMessageText: {
        type: "stop",
        text: `Unable to generate liquid address`,
      },
    };
  }

  const { destination, receiveFeesSat } = addressResponse;

  return {
    generatedAddress: destination,
    fee: receiveFeesSat,
  };
}
