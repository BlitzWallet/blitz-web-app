import { InputTypes } from "bitcoin-address-parser";
import formatSparkPaymentAddress from "../../../functions/sendBitcoin/formatSparkPaymentAddress";
import useThemeColors from "../../../hooks/useThemeColors";
import { useOverlay } from "../../../contexts/overlayContext";
import ThemeText from "../../../components/themeText/themeText";
import ContactProfileImage from "../../contacts/components/profileImage/profileImage";
import "./invoiceInfo.css";

export default function InvoiceInfo({
  paymentInfo,
  fromPage,
  contactInfo,
  theme,
  darkModeType,
}) {
  const formmateedSparkPaymentInfo = formatSparkPaymentAddress(paymentInfo);
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { openOverlay } = useOverlay();

  return (
    <div
      className="invoiceContainer"
      onClick={() => {
        openOverlay({
          for: "error",
          errorMessage: formmateedSparkPaymentInfo.address,
        });
      }}
      style={{
        backgroundColor: backgroundOffset,
      }}
    >
      {fromPage === "contacts" ? (
        <div className="contactRow">
          <div
            className="profileImage"
            style={{
              backgroundColor: backgroundColor,
            }}
          >
            <ContactProfileImage
              updated={contactInfo?.imageData?.updated}
              uri={contactInfo?.imageData?.localUri}
              darkModeType={darkModeType}
              theme={theme}
            />
          </div>
          <ThemeText
            className={"addressText"}
            CustomNumberOfLines={1}
            textContent={contactInfo?.name || ""}
          />
        </div>
      ) : (
        <ThemeText
          CustomNumberOfLines={2}
          textContent={
            paymentInfo?.type === InputTypes.LNURL_PAY
              ? paymentInfo.data.address
              : formmateedSparkPaymentInfo.address
          }
        />
      )}
    </div>
  );
}
