import { breezLiquidLNAddressPaymentWrapper } from "../breezLiquid";
import { getLiquidSdk } from "../connectToLiquid";

export default async function liquidToSparkSwap(contactUsername) {
  try {
    const sdk = getLiquidSdk();
    let maxRunCount = 5;
    let runCount = 0;
    let parsedData = null;
    while (maxRunCount > runCount && !parsedData) {
      runCount += 1;
      try {
        const parsed = await sdk.parse(`${contactUsername}@blitzwalletapp.com`);
        parsedData = parsed;
        break;
      } catch (err) {
        console.log("Error parsing LNURL, assuming its a backend issue");
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    if (!parsedData) throw new Error("Unable to retrive invoice for swap");

    const paymentResponse = await breezLiquidLNAddressPaymentWrapper({
      description: "Liquid to Spark Swap",
      paymentInfo: parsedData.data,
      shouldDrain: true,
    });

    if (!paymentResponse.didWork) throw new Error(paymentResponse.error);

    return { didWork: true };
  } catch (err) {
    console.log(err);

    return { didWork: false, error: err.message };
  }
}
