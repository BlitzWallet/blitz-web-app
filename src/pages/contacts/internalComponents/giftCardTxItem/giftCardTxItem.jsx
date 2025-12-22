import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import ThemeText from "../../../../components/themeText/themeText";
import { Colors } from "../../../../constants/theme";
import "./giftCardTxItem.css";

export default function GiftCardTxItem({
  txParsed,
  isOutgoingPayment,
  theme,
  darkModeType,
  backgroundOffset,
  textColor,
  t,
  timeDifference,
  isFromProfile,
  navigate,
  masterInfoObject,
}) {
  const giftCardName = txParsed.giftCardInfo?.name;

  const handleClick = () => {
    if (isFromProfile || !navigate) return;

    navigate("/modal", {
      state: {
        wantedContent: "viewContactsGiftInfo",
        giftCardInfo: txParsed.giftCardInfo,
        message: txParsed.description,
        from: "txItem",
        sliderHeight: 1,
        isOutgoingPayment,
      },
    });
  };

  return (
    <button
      disabled={isFromProfile}
      onClick={handleClick}
      className="gift-card-transaction-container"
    >
      {/* Gift Card Logo with subtle styling */}
      <div
        className="gift-card-logo-container"
        style={{
          backgroundColor: theme
            ? backgroundOffset
            : Colors.constants.opacityGracy,
          borderWidth: theme ? 0.5 : 2,
          borderColor: backgroundOffset,
          borderStyle: "solid",
        }}
      >
        <img
          className="gift-card-logo"
          src={txParsed.giftCardInfo.logo}
          alt={giftCardName}
        />
      </div>

      <div className="gift-card-content">
        {/* Gift card name with subtle emphasis */}
        <ThemeText
          CustomEllipsizeMode={"tail"}
          CustomNumberOfLines={1}
          textStyles={{
            margin: 0,
            marginRight: 15,
          }}
          textContent={giftCardName}
        />

        {/* Transaction type with gift card context */}
        <ThemeText
          CustomEllipsizeMode={"tail"}
          CustomNumberOfLines={1}
          textStyles={{
            fontSize: "0.8em",
            opacity: 0.8,
            margin: 0,
          }}
          textContent={
            isOutgoingPayment
              ? `${t("transactionLabelText.sent")} • ${t(
                  "contacts.internalComponents.viewAllGiftCards.cardNamePlaceH"
                )}`
              : `${t("transactionLabelText.received")} • ${t(
                  "contacts.internalComponents.viewAllGiftCards.cardNamePlaceH"
                )}`
          }
        />
        <ThemeText
          textStyles={{
            fontSize: "0.8em",
            fontWeight: 300,
            opacity: 0.7,
            margin: 0,
          }}
          textContent={timeDifference}
        />
      </div>

      <FormattedSatText
        frontText={
          masterInfoObject.userBalanceDenomination === "hidden"
            ? ""
            : isOutgoingPayment
            ? "-"
            : "+"
        }
        containerStyles={{
          marginBottom: "auto",
        }}
        styles={{
          fontWeight: 400,
        }}
        balance={txParsed.amountMsat}
        useMillionDenomination={true}
      />
    </button>
  );
}
