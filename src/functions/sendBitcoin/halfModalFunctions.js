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
    return { didWork: false, errorMessage: preParsingResponse.error };
  }

  if (preParsingResponse.navigateToWebView) {
    return { didWork: false, webViewURL: preParsingResponse.webViewURL };
  }

  return { didWork: true, data: preParsingResponse.btcAdress };
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

export { navigateToSendUsingClipboard, getQRImage };
