import { getAllSparkTransactions } from "../spark/transactions";

export default async function hasAlredyPaidInvoice({ scannedAddress }) {
  try {
    const allTransactions = await getAllSparkTransactions();

    const didPayWithSpark = allTransactions.find((tx) => {
      return (
        tx.paymentType === "lightning" &&
        JSON.parse(tx.details).address?.trim() === scannedAddress?.trim()
      );
    });

    return !!didPayWithSpark;
  } catch (err) {
    console.log("already paid invoice error", err);
    return false;
  }
}
