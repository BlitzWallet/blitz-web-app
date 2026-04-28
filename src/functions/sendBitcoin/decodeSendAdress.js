import { getLNAddressForLiquidPayment } from "./payments";
import processBitcoinAddress from "./processBitcoinAddress";
import processBolt11Invoice from "./processBolt11Invoice";
import processLNUrlAuth from "./processLNUrlAuth";
import processLNUrlPay from "./processLNUrlPay";
import processLNUrlWithdraw from "./processLNUrlWithdrawl";
import processLiquidAddress from "./processLiquidAddress";
// import processBolt12Offer from "./processBolt12Offer";
import displayCorrectDenomination from "../displayCorrectDenomination";
import getLiquidAddressFromSwap from "../boltz/magicRoutingHints";
import { SATSPERBITCOIN } from "../../constants";
import processSparkAddress from "./processSparkAddress";
import { decodeBip21Address } from "../bip21AddressFormmating";
import { decodeLNURL } from "../lnurl/bench32Formmater";
import { formatLightningAddress, isBlitzLNURLAddress } from "../lnurl";
import { handleCryptoQRAddress, isSupportedPNPQR } from "./getMerchantAddress";
import hanndleLNURLAddress from "./handleLNURLAddress";
import { parseInput, InputTypes } from "bitcoin-address-parser";
import { receiveSparkLightningPayment } from "../spark";
import {
  addDataToCollection,
  getPayLinkDoc,
  getSingleContact,
} from "../../../db";
import { getCachedProfileImage } from "../cachedImage";
import { decodeSparkInvoice } from "../spark/decodeInvoices";
import { deriveSparkAddress } from "../gift/deriveGiftWallet";

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
    sparkInformation,
    seletctedToken,
    currentWalletMnemoinc,
    t,
    contactInfo,
    globalContactsInformation,
    accountMnemoinc,
    usablePaymentMethod,
    bitcoinBalance,
    dollarBalanceSat,
    convertedSendAmount,
    poolInfoRef,
    swapLimits,
    // usd_multiplier_coefiicent,
    min_usd_swap_amount,
    conversionFiatStats,
    primaryDisplay,
  } = props;

  let paylinkPublishFunc = null;
  let resolvedBlitzContact = null;

  try {
    console.log(btcAdress, "testing");
    if (typeof btcAdress !== "string")
      throw new Error(t("wallet.sendPages.handlingAddressErrors.invlidFormat"));

    if (btcAdress.toLowerCase().startsWith("paylink://")) {
      const payLinkId = btcAdress.slice("paylink://".length);
      setLoadingMessage(t("wallet.payLinks.preparingPayment"));

      const result = await getPayLinkDoc(payLinkId);
      if (!result.didWork) {
        return goBackFunction(result.error || t("wallet.payLinks.notFound"));
      }

      const { amount, description, identityPubKey, isPaid } = result.data;
      if (isPaid) {
        return goBackFunction(t("wallet.payLinks.alreadyPaid"));
      }

      const lnInvoice = await receiveSparkLightningPayment({
        amountSats: amount,
        memo: description,
        mnemonic: currentWalletMnemoinc,
        includeSparkAddress: false,
        receiverIdentityPubkey: identityPubKey,
      });

      if (!lnInvoice.didWork) {
        return goBackFunction(
          lnInvoice.error || t("wallet.payLinks.invoiceError"),
        );
      }

      btcAdress = lnInvoice.response.invoice.encodedInvoice;
      enteredPaymentInfo = {
        ...enteredPaymentInfo,
        fromContacts: true,
        amount,
        description,
      };
      paylinkPublishFunc = async () => {
        await addDataToCollection(
          { datePaid: Date.now(), isPaid: true },
          "blitzPaylinks",
          payLinkId,
        );
      };
    }

    if (
      btcAdress.startsWith("@") ||
      btcAdress.length <= 30 ||
      isBlitzLNURLAddress(btcAdress)
    ) {
      let username = "";

      if (isBlitzLNURLAddress(btcAdress)) {
        username = btcAdress.split("@")[0].trim();
      } else {
        username = btcAdress.startsWith("@")
          ? btcAdress.slice(1).trim()
          : btcAdress.trim();
      }

      if (!username) {
        return goBackFunction(
          t("wallet.sendPages.handlingAddressErrors.blitzUserNotFound"),
        );
      }
      const results = await getSingleContact(username);
      const profile = results?.[0]?.contacts?.myProfile;
      const sparkAddress = profile?.sparkAddress;
      if (!sparkAddress && btcAdress.startsWith("@")) {
        return goBackFunction(
          t("wallet.sendPages.handlingAddressErrors.blitzUserNotFound"),
        );
      }
      if (sparkAddress) {
        btcAdress = sparkAddress;
        const imageData = await getCachedProfileImage(profile.uuid).catch(
          () => null,
        );
        resolvedBlitzContact = {
          name: profile.name || profile.uniqueName || "",
          uniqueName: profile.uniqueName || "",
          bio: profile.bio || "",
          uuid: profile.uuid,
          imageData,
        };
      }
    }

    if (isSupportedPNPQR(btcAdress)) {
      btcAdress = handleCryptoQRAddress(
        btcAdress,
        getLNAddressForLiquidPayment,
      );
    }

    if (
      btcAdress?.toLowerCase()?.startsWith("spark:") ||
      btcAdress?.toLowerCase()?.startsWith("sp1p") ||
      btcAdress?.toLowerCase()?.startsWith("spark1")
    ) {
      if (btcAdress.startsWith("spark:")) {
        const processedAddress = decodeBip21Address(btcAdress, "spark");

        const decodeResponse = decodeSparkInvoice(processedAddress.address);

        const sparkAddress = deriveSparkAddress(
          Buffer.from(decodeResponse.identityPublicKey, "hex"),
        );

        parsedInvoice = {
          type: "Spark",
          address: {
            address: sparkAddress.address,
            message: processedAddress.options.message,
            label: processedAddress.options.label,
            network: "Spark",
            expectedReceive: decodeResponse.paymentType,
            expectedToken: decodeResponse.tokenIdentifierBech32m,
            amount: processedAddress.options.amount,
          },
        };
      } else {
        const decodeResponse = decodeSparkInvoice(btcAdress);
        const sparkAddress = deriveSparkAddress(
          Buffer.from(decodeResponse.identityPublicKey, "hex"),
        );

        parsedInvoice = {
          type: "Spark",
          address: {
            address: sparkAddress.address,
            message: null,
            label: null,
            network: "Spark",
            expectedReceive: decodeResponse.paymentType,
            expectedToken: decodeResponse.tokenIdentifierBech32m,
            amount: null,
          },
        };
      }
    }

    // // handle bip21 qrs
    // if (
    //   btcAdress.toLowerCase().startsWith("lightning") ||
    //   btcAdress.toLowerCase().startsWith("bitcoin")
    // ) {
    //   const decodedAddress = decodeBip21Address(
    //     btcAdress,
    //     btcAdress.toLowerCase().startsWith("lightning")
    //       ? "lightning"
    //       : "bitcoin"
    //   );

    //   const lightningInvoice = btcAdress.toLowerCase().startsWith("lightning")
    //     ? decodedAddress.address.toUpperCase()
    //     : decodedAddress.options.lightning?.toUpperCase();

    //   if (lightningInvoice)
    //     btcAdress = await hanndleLNURLAddress(lightningInvoice);
    // }

    // if (btcAdress.toLowerCase().startsWith("lnurl")) {
    //   btcAdress = await hanndleLNURLAddress(btcAdress);
    // }
    console.log(btcAdress, "bitcoin address");
    let input;
    try {
      const chosenPath = parsedInvoice
        ? Promise.resolve(parsedInvoice)
        : parseInput(btcAdress);
      input = await chosenPath;
      if (!input) throw new Error("Invalid address provided");
    } catch (err) {
      console.log(err, "parse error");
      return goBackFunction(
        t("wallet.sendPages.handlingAddressErrors.parseError"),
      );
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
        contactInfo,
        sparkInformation,
        globalContactsInformation,
        accountMnemoinc,
        usablePaymentMethod,
        bitcoinBalance,
        dollarBalanceSat,
        convertedSendAmount,
        poolInfoRef,
        swapLimits,
        // usd_multiplier_coefiicent,
        min_usd_swap_amount,
      });
    } catch (err) {
      console.error(err);
      return goBackFunction(
        err.message ||
          t("wallet.sendPages.handlingAddressErrors.paymentProcessingError"),
      );
    }

    console.log(processedPaymentInfo, "proceessed info");
    if (processedPaymentInfo) {
      // if (
      //   comingFromAccept &&
      //   (seletctedToken?.tokenMetadata?.tokenTicker === "Bitcoin" ||
      //     seletctedToken?.tokenMetadata?.tokenTicker === undefined) &&
      //   sparkInformation.balance <
      //     processedPaymentInfo.paymentFee +
      //       processedPaymentInfo.supportFee +
      //       enteredPaymentInfo.amount
      // ) {
      //   openOverlay({
      //     for: "error",
      //     errorMessage: t(
      //       "wallet.sendPages.handlingAddressErrors.tooLowSendingAmount",
      //       {
      //         amount: displayCorrectDenomination({
      //           amount: Math.max(
      //             sparkInformation.balance -
      //               (processedPaymentInfo.paymentFee +
      //                 processedPaymentInfo.supportFee),
      //             0,
      //           ),
      //           masterInfoObject,
      //           fiatStats,
      //         }),
      //       },
      //     ),
      //   });

      //   if (fromPage !== "contacts") return;
      // }
      setPaymentInfo({
        ...processedPaymentInfo,
        decodedInput: input,
        ...(resolvedBlitzContact
          ? { blitzContactInfo: resolvedBlitzContact }
          : {}),
      });
    } else {
      if (input.type === InputTypes.LNURL_AUTH) return;

      if (input.type === InputTypes.LNURL_WITHDRAWL) {
        // navigate.navigate("ErrorScreen", {
        //   errorMessage: t(
        //     "wallet.sendPages.handlingAddressErrors.lnurlWithdrawlSuccess"
        //   ),
        //   customNavigator: () =>
        //     navigate.popTo("HomeAdmin", { screen: "home" }),
        // });
        return;
      }
      return goBackFunction(
        t("wallet.sendPages.handlingAddressErrors.processInputError"),
      );
    }
  } catch (err) {
    console.error("Decoding send address error:", err);
    goBackFunction(
      err.message ||
        t("wallet.sendPages.handlingAddressErrors.unkonwDecodeError"),
    );
    return;
  }
}

async function processInputType(input, context) {
  const { t, setLoadingMessage } = context;
  setLoadingMessage(t("wallet.sendPages.handlingAddressErrors.invoiceDetails"));

  switch (input.type) {
    case InputTypes.BITCOIN_ADDRESS:
      return await processBitcoinAddress(input, context);

    case InputTypes.BOLT11:
      return await processBolt11Invoice(input, context);

    case InputTypes.LNURL_AUTH:
      return await processLNUrlAuth(input, context);

    case InputTypes.LNURL_PAY:
      return await processLNUrlPay(input, context);

    case InputTypes.LNURL_WITHDRAWL:
      return await processLNUrlWithdraw(input, context);

    // case LiquidTypeVarient.LIQUID_ADDRESS:
    // return processLiquidAddress(input, context);

    case "lnUrlError":
      throw new Error(input.data.reason);

    case "Spark":
      return await processSparkAddress(input, context);
    default:
      throw new Error(
        t("wallet.sendPages.handlingAddressErrors.invalidInputType"),
      );
  }
}
