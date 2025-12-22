import { useTranslation } from "react-i18next";

import ThemeText from "../../../components/themeText/themeText";
import FormattedSatText from "../../../components/formattedSatText/formattedSatText";

export default function SendTransactionFeeInfo({
  paymentFee,
  isLightningPayment,
  isLiquidPayment,
  isBitcoinPayment,
  isSparkPayment,
}) {
  const { t } = useTranslation();
  return (
    <>
      <ThemeText
        textStyles={{ marginTop: 30, marginBottom: 0 }}
        textContent={t("wallet.sendPages.feeInfo.title")}
      />
      <FormattedSatText
        backText={t("wallet.sendPages.feeInfo.backTextToAmount", {
          amount:
            isLightningPayment || isLiquidPayment || isSparkPayment
              ? ` ${t("constants.andLower")} ${t("constants.instant")}`
              : ` ${t("constants.andLower")} ${t(
                  "wallet.sendPages.feeInfo.tenMinutes",
                  {
                    numMins: 10,
                  }
                )}`,
        })}
        neverHideBalance={true}
        styles={{ margin: 0 }}
        balance={paymentFee}
      />
    </>
  );
}
