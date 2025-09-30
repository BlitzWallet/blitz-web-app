import { getLiquidSdk } from "../connectToLiquid";

export default async function processLNUrlAuth(input, context) {
  const { goBackFunction, navigate, setLoadingMessage } = context;
  try {
    const sdk = getLiquidSdk();
    setLoadingMessage("Starting LNURL auth");
    const result = await sdk.lnurlAuth(input.data);
    console.log(result);
    if (result.type?.toLowerCase() === "ok") {
      navigate("/confirm-page", {
        state: {
          useLNURLAuth: true,
        },
      });
    } else {
      goBackFunction("Failed to authenticate LNURL");
    }
  } catch (err) {
    console.log(err);
    goBackFunction(err.message);
  }
}
