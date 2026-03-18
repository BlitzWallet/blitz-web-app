import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Receipt } from "lucide-react";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { useToast } from "../../../../../contexts/toastManager";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { Colors } from "../../../../../constants/theme";
import "../style.css";

export default function HistoricalPurchases() {
  const { decodedGiftCards, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { showToast } = useToast();
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { backgroundColor } = useThemeColors();

  async function removeGiftCardFromList(selectedCardId) {
    const newCardsList = decodedGiftCards?.purchasedCards?.filter(
      (card) => card.uuid !== selectedCardId,
    );
    try {
      const em = await encryptMessage(
        contactsPrivateKey,
        publicKey,
        JSON.stringify({
          ...decodedGiftCards,
          purchasedCards: newCardsList,
        }),
      );
      toggleGlobalAppDataInformation({ giftCards: em }, true);
    } catch (err) {
      console.log("remove gift card error", err);
    }
  }

  function handleRemoveClick(uuid) {
    if (
      window.confirm(t("apps.giftCards.historicalPurchasesPage.confirmRemoval"))
    ) {
      removeGiftCardFromList(uuid);
    }
  }

  const purchasedCards = decodedGiftCards?.purchasedCards || [];
  const isEmpty = purchasedCards.length === 0;

  return (
    <div className="giftCardsContainer">
      <CustomSettingsNavBar customBackFunction={() => navigate(-1)} />

      {isEmpty ? (
        <div className="historicalPurchasesEmpty">
          <Receipt
            size={48}
            color={theme ? Colors.dark.text : Colors.light.text}
            style={{ opacity: 0.4 }}
          />
          <ThemeText
            textContent={t("apps.noPurchaseTitle")}
            textStyles={{
              fontSize: 18,
              fontWeight: "500",
              textAlign: "center",
              marginTop: 16,
            }}
          />
          <ThemeText
            textContent={t(
              "apps.giftCards.historicalPurchasesPage.noPurchases",
            )}
            textStyles={{ textAlign: "center", opacity: 0.7 }}
          />
        </div>
      ) : (
        <>
          <div className="historicalPurchasesList">
            {purchasedCards.map((item) => (
              <button
                key={item.id}
                className="historicalPurchaseRow"
                style={{
                  borderBottomColor: Colors.constants.opacityGracy,
                }}
                onClick={() =>
                  navigate("/store-item", {
                    state: { for: "giftcards-order-details", item },
                  })
                }
              >
                <img
                  className="historicalPurchaseLogo"
                  src={item.logo}
                  alt={item.name}
                />
                <div className="historicalPurchaseInfo">
                  <ThemeText
                    textContent={item.name}
                    textStyles={{
                      fontWeight: "500",
                      marginBottom: 4,
                      margin: 0,
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                  <ThemeText
                    textContent={`${t(
                      "apps.giftCards.historicalPurchasesPage.purchased",
                    )} ${new Date(item.date).toDateString()}`}
                    textStyles={{
                      fontSize: 12,
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                </div>
                <div
                  className="historicalPurchaseRemoveBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveClick(item.uuid);
                  }}
                  aria-label="Remove"
                >
                  <X
                    size={18}
                    color={theme ? Colors.dark.text : Colors.light.text}
                  />
                </div>
              </button>
            ))}
          </div>

          <CustomButton
            textContent={t("constants.support")}
            actionFunction={() =>
              window.open(
                "mailto:support@thebitcoincompany.com?subject=Gift%20cards%20payment%20error",
                "_self",
              )
            }
            buttonStyles={{ width: "90%", margin: "auto auto 20px" }}
          />
        </>
      )}
    </div>
  );
}
