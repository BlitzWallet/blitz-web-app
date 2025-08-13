import * as bip21 from "bip21";

export function formatBip21Address({
  address = "",
  amount = 0,
  message = "",
  prefix = "",
}) {
  try {
    return bip21.encode(
      address,
      {
        amount: amount,
        label: message,
        message: message,
      },
      prefix
    );
  } catch (err) {
    console.log("format bip21 spark address error", err);
    return "";
  }
}
export function decodeBip21Address(address, prefix) {
  try {
    return bip21.decode(address, prefix);
  } catch (err) {
    console.log("format bip21 spark address error", err);
    return "";
  }
}
