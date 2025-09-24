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
import { decodeBip21Address } from "../bip21AddressFormmating";
import { decodeLNURL } from "../lnurl/bench32Formmater";
import { formatLightningAddress } from "../lnurl";
import { handleCryptoQRAddress, isSupportedPNPQR } from "./getMerchantAddress";
import hanndleLNURLAddress from "./handleLNURLAddress";

export default async function decodeSendAddress(props) {
  let {
    btcAdress,
    goBackFunction,
    setPaymentInfo,
    liquidNodeInformation,
    masterInfoObject,
    // webViewRef,
    navigate,
    // maxZeroConf,
    comingFromAccept,
    enteredPaymentInfo,
    setLoadingMessage,
    paymentInfo,
    parsedInvoice,
    fiatStats,
    fromPage,
    publishMessageFunc,
    sparkInformation,
    seletctedToken,
    currentWalletMnemoinc,
    t,
  } = props;

  try {
    const sdk = getLiquidSdk();
    if (!btcAdress) throw new Error("No address found, please try again.");
    // Handle cryptoqr.net special case

    if (isSupportedPNPQR(btcAdress)) {
      btcAdress = handleCryptoQRAddress(
        btcAdress,
        getLNAddressForLiquidPayment
      );
    }

    if (
      btcAdress?.toLowerCase()?.startsWith("spark:") ||
      btcAdress?.toLowerCase()?.startsWith("sp1p") ||
      btcAdress?.toLowerCase()?.startsWith("spark1")
    ) {
      if (btcAdress.toLowerCase().startsWith("spark:")) {
        const processedAddress = decodeBip21Address(btcAdress, "spark");
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

    // handle bip21 qrs
    if (
      btcAdress.toLowerCase().startsWith("lightning") ||
      btcAdress.toLowerCase().startsWith("bitcoin")
    ) {
      const decodedAddress = decodeBip21Address(
        btcAdress,
        btcAdress.toLowerCase().startsWith("lightning")
          ? "lightning"
          : "bitcoin"
      );

      const lightningInvoice = btcAdress.toLowerCase().startsWith("lightning")
        ? decodedAddress.address.toUpperCase()
        : decodedAddress.options.lightning?.toUpperCase();

      if (lightningInvoice)
        btcAdress = await hanndleLNURLAddress(lightningInvoice);
    }

    if (btcAdress.toLowerCase().startsWith("lnurl")) {
      btcAdress = await hanndleLNURLAddress(btcAdress);
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

    let processedPaymentInfo;
    try {
      processedPaymentInfo = await processInputType(input, {
        fiatStats,
        liquidNodeInformation,
        masterInfoObject,
        navigate,
        goBackFunction,
        // maxZeroConf,
        comingFromAccept,
        enteredPaymentInfo,
        setPaymentInfo,
        // webViewRef,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        seletctedToken,
        currentWalletMnemoinc,
        t,
      });
    } catch (err) {
      console.error(err);
      return goBackFunction(err.message || "Error processing payment info");
    }

    console.log(processedPaymentInfo, "proceessed info");
    if (processedPaymentInfo) {
      if (
        comingFromAccept &&
        (seletctedToken?.tokenMetadata?.tokenTicker === "Bitcoin" ||
          seletctedToken?.tokenMetadata?.tokenTicker === undefined) &&
        sparkInformation.balance <
          processedPaymentInfo.paymentFee +
            processedPaymentInfo.supportFee +
            enteredPaymentInfo.amount
      ) {
        // navigate.navigate("ErrorScreen", {
        //   errorMessage: t(
        //     "wallet.sendPages.handlingAddressErrors.tooLowSendingAmount",
        //     {
        //       amount: displayCorrectDenomination({
        //         amount: Math.max(
        //           sparkInformation.balance -
        //             (processedPaymentInfo.paymentFee +
        //               processedPaymentInfo.supportFee),
        //           0
        //         ),
        //         masterInfoObject,
        //         fiatStats,
        //       }),
        //     }
        //   ),
        // });

        if (fromPage !== "contacts") return;
      }
      setPaymentInfo({ ...processedPaymentInfo, decodedInput: input });
    } else {
      if (input.type === LIQUID_TYPES.LnUrlAuth) return;

      if (input.type === LIQUID_TYPES.LnUrlWithdraw) {
        // navigate.navigate("ErrorScreen", {
        //   errorMessage: t(
        //     "wallet.sendPages.handlingAddressErrors.lnurlWithdrawlSuccess"
        //   ),
        //   customNavigator: () =>
        //     navigate.popTo("HomeAdmin", { screen: "home" }),
        // });
        return;
      }
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
      return await processBolt11Invoice(input, context);

    case LIQUID_TYPES.LnUrlAuth.toLowerCase():
      return await processLNUrlAuth(input, context);

    case LIQUID_TYPES.LnUrlPay.toLowerCase(): //works
      return await processLNUrlPay(input, context);

    case LIQUID_TYPES.LnUrlWithdraw.toLowerCase():
      return await processLNUrlWithdraw(input, context);

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
