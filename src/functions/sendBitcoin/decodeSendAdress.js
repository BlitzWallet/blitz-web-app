import { getLNAddressForLiquidPayment } from "./payments";
import processBitcoinAddress from "./processBitcoinAddress";
import processBolt11Invoice from "./processBolt11Invoice";
import processLNUrlAuth from "./processLNUrlAuth";
import processLNUrlPay from "./processLNUrlPay";
import processLNUrlWithdraw from "./processLNUrlWithdrawl";
import processLiquidAddress from "./processLiquidAddress";
// import processBolt12Offer from "./processBolt12Offer";
import { getLiquidSdk } from "../connectToLiquid";
import displayCorrectDenomination from "../displayCorrectDenomination";
import getLiquidAddressFromSwap from "../boltz/magicRoutingHints";
import { LIQUID_TYPES, SATSPERBITCOIN } from "../../constants";
import processSparkAddress from "./processSparkAddress";
import { decodeBip21SparkAddress } from "../spark/handleBip21SparkAddress";

export default async function decodeSendAddress(props) {
  let {
    btcAdress,
    goBackFunction,
    setPaymentInfo,
    liquidNodeInformation,
    masterInfoObject,
    // webViewRef,
    navigate,
    maxZeroConf,
    comingFromAccept,
    enteredPaymentInfo,
    setLoadingMessage,
    paymentInfo,
    parsedInvoice,
    fiatStats,
    fromPage,
    publishMessageFunc,
  } = props;

  try {
    const sdk = getLiquidSdk();
    // Handle cryptoqr.net special case
    if (btcAdress.includes("cryptoqr.net")) {
      try {
        const [username, domain] = btcAdress.split("@");
        const response = await fetch(
          `https://${domain}/.well-known/lnurlp/${username}`
        );
        const data = await response.json();

        if (data.status === "ERROR") {
          goBackFunction(
            "Not able to get merchant payment information from invoice"
          );
          return;
        }

        const bolt11 = await getLNAddressForLiquidPayment(
          { data, type: "lnurlpay" },
          data.minSendable / 1000
        );

        if (!bolt11) throw new Error("Not able to parse invoice");

        const parsedInvoice = await sdk.parseInvoice(bolt11);

        if (parsedInvoice.amountMsat / 1000 >= maxZeroConf) {
          goBackFunction(
            `Cannot send more than ${displayCorrectDenomination({
              amount: maxZeroConf,
              masterInfoObject,
              fiatStats,
            })} to a merchant`
          );
          return;
        }
        btcAdress = bolt11;
      } catch (err) {
        console.log("error getting cryptoQR", err);
        goBackFunction(
          `There was a problem getting the invoice for this address`
        );
        return;
      }
    }
    if (
      btcAdress.toLowerCase().startsWith("spark:") ||
      btcAdress.toLowerCase().startsWith("sp1p")
    ) {
      if (btcAdress.toLowerCase().startsWith("spark:")) {
        const processedAddress = decodeBip21SparkAddress(btcAdress);
        parsedInvoice = {
          type: "Spark",
          address: {
            address: processedAddress.address,
            message: processedAddress.options.message,
            label: processedAddress.options.label,
            network: "Spark",
            amount: processedAddress.options.amount * SATSPERBITCOIN,
          },
        };
      } else {
        parsedInvoice = {
          type: "Spark",
          address: {
            address: btcAdress,
            message: null,
            label: null,
            network: "Spark",
            amount: null,
          },
        };
      }
    }

    const chosenPath = parsedInvoice
      ? Promise.resolve(parsedInvoice)
      : sdk.parse(btcAdress);

    let input;
    try {
      input = await chosenPath;
    } catch (err) {
      console.error(err, "parsing address error");
      return goBackFunction("Unable to parse address");
    }
    console.log(input, "parsed input");

    if (input.type.toLowerCase() === LIQUID_TYPES.Bolt11.toLowerCase()) {
      try {
        const isMagicRoutingHint = await getLiquidAddressFromSwap(
          input.invoice.bolt11
        );
        if (isMagicRoutingHint) {
          const parsed = await sdk.parse(isMagicRoutingHint);
          input = parsed;
        }
      } catch (err) {
        goBackFunction("Failed to resolve embedded liquid address");
        return;
      }
    }

    let processedPaymentInfo;
    try {
      processedPaymentInfo = await processInputType(input, {
        fiatStats,
        liquidNodeInformation,
        masterInfoObject,
        navigate,
        goBackFunction,
        maxZeroConf,
        comingFromAccept,
        enteredPaymentInfo,
        setPaymentInfo,
        // webViewRef,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        publishMessageFunc,
      });
    } catch (err) {
      console.error(err);
      return goBackFunction(err.message || "Error processing payment info");
    }

    console.log(processedPaymentInfo, "proceessed info");
    if (processedPaymentInfo) {
      setPaymentInfo({ ...processedPaymentInfo, decodedInput: input });
    } else {
      return goBackFunction("Unable to process input");
    }
  } catch (err) {
    console.log(err, "Decoding send address erorr");
    goBackFunction(err.message);
    return;
  }
}

async function processInputType(input, context) {
  const { navigate, goBackFunction, setLoadingMessage } = context;
  setLoadingMessage("Getting invoice details");

  switch (input.type.toLowerCase()) {
    case LIQUID_TYPES.BitcoinAddress.toLowerCase():
      return await processBitcoinAddress(input, context);

    case LIQUID_TYPES.Bolt11.toLowerCase(): //works
      return processBolt11Invoice(input, context);

    case LIQUID_TYPES.LnUrlAuth.toLowerCase():
      return await processLNUrlAuth(input, context);

    case LIQUID_TYPES.LnUrlPay.toLowerCase(): //works
      return processLNUrlPay(input, context);

    // case LIQUID_TYPES.LnUrlWithdraw.toLowerCase():
    //   return await processLNUrlWithdraw(input, context);

    // case LIQUID_TYPES.LiquidAddress.toLowerCase(): //doesnt work
    //   return processLiquidAddress(input, context);

    // case "bolt12offer":
    //   return processBolt12Offer(input, context);

    case "spark":
      return await processSparkAddress(input, context);
    default:
      throw new Error(`Unsupported address type: ${input.type.toLowerCase()}`);
  }
}
