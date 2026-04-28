import handlePreSendPageParsing from "./handlePreSendPageParsing";
import getDataFromClipboard from "../getDataFromClipboard";
import QrScanner from "qr-scanner";

async function navigateToSendUsingClipboard() {
  const response = await getDataFromClipboard();

  if (!response) {
    return { didWork: false };
  }
  const clipboardData = response?.trim();

  const preParsingResponse = handlePreSendPageParsing(clipboardData);

  if (preParsingResponse.error) {
    return {
      didWork: false,
      errorMessage: preParsingResponse.error,
      page: "send",
    };
  }

  if (preParsingResponse.navigateToWebView) {
    return {
      didWork: false,
      webViewURL: preParsingResponse.webViewURL,
      page: "send",
    };
  }

  if (preParsingResponse.isExternalChain) {
    const { method, screen, params } = resolveExternalChainNavigation(
      preParsingResponse,
      from,
    );
    return {
      didWork: true,
      params,
      page: screen,
    };
  }

  return { didWork: true, data: preParsingResponse.btcAdress, page: "send" };
}

async function getQRImage(fileInput) {
  return new Promise((resolve) => {
    if (!fileInput) return resolve({ didWork: false });

    // reset value so same file can be picked again
    fileInput.value = "";

    const handleChange = async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        fileInput.removeEventListener("change", handleChange);
        return resolve({ didWork: false });
      }

      try {
        const result = await QrScanner.scanImage(file, {
          returnDetailedScanResult: true,
        });
        console.log(result, "result from file listener");

        const data = result.data;
        console.log(data);
        const preParsingResponse = handlePreSendPageParsing(data);
        console.log(preParsingResponse);

        if (preParsingResponse.error) {
          resolve({
            btcAdress: "",
            didWork: false,
            error: preParsingResponse.error,
          });
        } else if (preParsingResponse.navigateToWebView) {
          resolve({
            btcAdress: "",
            didWork: false,
            error: "errormessages.noInvoiceInImageError",
          });
        } else if (preParsingResponse.isExternalChain) {
          resolve({
            isExternalChain: true,
            address: preParsingResponse.address,
            chainFamily: preParsingResponse.chainFamily,
            resolvedToken: preParsingResponse.resolvedToken,
            prefillAmount: preParsingResponse.prefillAmount,
            unsupportedTokenAddress: preParsingResponse.unsupportedTokenAddress,
            didWork: true,
            error: "",
          });
        } else {
          resolve({
            btcAdress: preParsingResponse.btcAdress,
            didWork: true,
            error: "",
          });
        }
      } catch (err) {
        resolve({ didWork: false, error: "QR scan failed" });
      } finally {
        fileInput.removeEventListener("change", handleChange);
      }
    };

    fileInput.addEventListener("change", handleChange);
    fileInput.click();
  });
}

function formatStablecoinAmount(rawAmount, decimals = 2) {
  const value = Number(rawAmount) / Math.pow(10, 6);
  return value.toFixed(decimals);
}

function resolveExternalChainNavigation(parsedResult, from) {
  if (parsedResult.resolvedToken) {
    return {
      screen: "StablecoinSendScreen",
      params: {
        address: parsedResult.address,
        chain: parsedResult.resolvedToken.chain,
        chainLabel: parsedResult.resolvedToken.chainLabel,
        asset: parsedResult.resolvedToken.asset,
        ...(parsedResult.prefillAmount != null
          ? { prefillAmount: parsedResult.prefillAmount }
          : {}),
      },
    };
  }

  if (parsedResult.unsupportedTokenAddress) {
    return {
      screen: "SelectStablecoinParamsScreen",
      params: {
        address: parsedResult.address,
        chainFamily: parsedResult.chainFamily,
        unsupportedTokenMessage: i18next.t("errormessages.usdcUsdtTokensOnly"),
      },
    };
  }

  return {
    screen: "SelectStablecoinParamsScreen",
    params: {
      address: parsedResult.address,
      chainFamily: parsedResult.chainFamily,
    },
  };
}

export {
  navigateToSendUsingClipboard,
  getQRImage,
  formatStablecoinAmount,
  resolveExternalChainNavigation,
};
