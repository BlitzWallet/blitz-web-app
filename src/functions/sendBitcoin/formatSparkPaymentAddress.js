export default function formatSparkPaymentAddress(paymentInfo, isLRC20Payment) {
  let formmateedSparkPaymentInfo = {
    address: "",
    paymentType: "",
  };
  const loweredType = paymentInfo.type.toLowerCase();

  if (loweredType === "bolt11") {
    formmateedSparkPaymentInfo.address =
      paymentInfo?.decodedInput?.invoice?.bolt11;
    formmateedSparkPaymentInfo.paymentType = "lightning";
  } else if (loweredType === "spark") {
    formmateedSparkPaymentInfo.address = paymentInfo?.data?.address;
    formmateedSparkPaymentInfo.paymentType = isLRC20Payment ? "lrc20" : "spark";
  } else if (loweredType === "lnurlpay") {
    formmateedSparkPaymentInfo.address = paymentInfo?.data?.invoice;
    formmateedSparkPaymentInfo.paymentType = "lightning";
  } else if (loweredType === "liquid") {
    formmateedSparkPaymentInfo.address = paymentInfo?.data?.invoice;
    formmateedSparkPaymentInfo.paymentType = "lightning";
    console.log(paymentInfo?.boltzData);
  } else if (loweredType === "bitcoin") {
    formmateedSparkPaymentInfo.address = paymentInfo?.address;
    formmateedSparkPaymentInfo.paymentType = "bitcoin";
  }
  return formmateedSparkPaymentInfo;
}
