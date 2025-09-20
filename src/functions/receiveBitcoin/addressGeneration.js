import {
  BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
  SATSPERBITCOIN,
} from "../../constants";
import { breezLiquidReceivePaymentWrapper } from "../breezLiquid";

import customUUID from "../customUUID";
import { sparkReceivePaymentWrapper } from "../spark/payments";

let invoiceTracker = [];
export async function initializeAddressProcess(wolletInfo) {
  const { setAddressState, selectedRecieveOption } = wolletInfo;
  const requestUUID = customUUID();
  invoiceTracker.push(requestUUID);
  let stateTracker = {};
  let hasGlobalError = false;
  console.log(wolletInfo.currentWalletMnemoinc);
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
    if (selectedRecieveOption.toLowerCase() === "lightning") {
      const response = await sparkReceivePaymentWrapper({
        paymentType: "lightning",
        amountSats: wolletInfo.receivingAmount,
        memo: wolletInfo.description,
        mnemoinc: wolletInfo.currentWalletMnemoinc,
      });
      // const response = await generateLightningAddress(wolletInfo);
      if (!response.didWork) throw new Error("Error with lightning");
      stateTracker = {
        generatedAddress: response.invoice,
        fee: 0,
      };
      // stateTracker = response
    } else if (selectedRecieveOption.toLowerCase() === "bitcoin") {
      const response = await sparkReceivePaymentWrapper({
        paymentType: "bitcoin",
        amountSats: wolletInfo.receivingAmount,
        memo: wolletInfo.description,
        mnemoinc: wolletInfo.currentWalletMnemoinc,
      });
      // const response = await generateBitcoinAddress(wolletInfo);
      if (!response.didWork) throw new Error("Error with bitcoin");
      stateTracker = {
        generatedAddress: response.invoice,
        fee: 0,
      };
      // stateTracker = response;
    } else if (selectedRecieveOption.toLowerCase() === "spark") {
      const response = await sparkReceivePaymentWrapper({
        paymentType: "spark",
        amountSats: wolletInfo.receivingAmount,
        memo: wolletInfo.description,
        mnemoinc: wolletInfo.currentWalletMnemoinc,
      });

      // const response = await generateBitcoinAddress(wolletInfo);
      if (!response.didWork) throw new Error("Error with spark");
      stateTracker = {
        generatedAddress: response.invoice,
        fee: 0,
      };
    } else {
      const response = await generateLiquidAddress(wolletInfo);
      if (!response) throw new Error("Error with Liquid");
      stateTracker = response;
    }
  } catch (error) {
    console.log(error, "HANDLING ERROR");
    stateTracker = {
      generatedAddress: null,
      errorMessageText: {
        type: "stop",
        text: error.message,
      },
    };
  } finally {
    if (invoiceTracker.length > 3) invoiceTracker = [invoiceTracker.pop()];

    if (invoiceTracker[invoiceTracker.length - 1] === requestUUID) {
      if (hasGlobalError) {
        setAddressState((prev) => {
          return {
            ...prev,
            hasGlobalError: true,
            isGeneratingInvoice: false,
          };
        });
      } else {
        setAddressState((prev) => {
          return {
            ...prev,
            ...stateTracker,
            isGeneratingInvoice: false,
          };
        });
      }
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
