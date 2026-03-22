import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import FullLoadingScreen from "../../../../../components/fullLoadingScreen/fullLoadingScreen";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { Colors } from "../../../../../constants/theme";
import { EMAIL_REGEX } from "../../../../../constants";
import "../style.css";

export default function ExpandedGiftCard({ giftCard }) {
  const selectedItem = giftCard;
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { decodedGiftCards, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isVariable =
    selectedItem?.denominationType === "Variable" &&
    selectedItem?.denominations?.length >= 2;

  const [selectedDenomination, setSelectedDenomination] = useState(
    isVariable ? "" : selectedItem?.denominations?.[0] ?? ""
  );
  const [email, setEmail] = useState(decodedGiftCards?.profile?.email || "");
  const [numberOfGiftCards] = useState("1");

  const variableRange = [
    selectedItem?.denominations?.[0],
    selectedItem?.denominations?.[selectedItem.denominations.length - 1],
  ];
  const step = Math.round((variableRange[1] - variableRange[0]) / 7);

  const variableArray = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const floorAmount = Math.floor((variableRange[0] + step * i) / 50) * 50;
      const amount = variableRange[0] + step * i;
      if (i === 0) return variableRange[0];
      else if (i === 7) return variableRange[1];
      else {
        if (amount < 50) return Math.floor(amount / 5) * 5;
        else if (amount > 50 && amount < 150)
          return Math.floor(amount / 10) * 10;
        else return floorAmount;
      }
    });
  }, [variableRange, step]);

  const denominationArray = isVariable
    ? variableArray
    : selectedItem?.denominations || [];

  const canPurchaseCard =
    Number(selectedDenomination) >= variableRange[0] &&
    Number(selectedDenomination) <= variableRange[1];

  const isFormValid =
    canPurchaseCard &&
    Number(numberOfGiftCards) >= 1 &&
    EMAIL_REGEX.test(email);

  const isTermsHTML =
    selectedItem?.terms?.includes("<p>") ||
    selectedItem?.terms?.includes("br");

  const primaryColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;

  function handlePurchase() {
    if (!canPurchaseCard || !selectedDenomination) {
      return;
    }
    if (!email) return;

    // If email differs from saved, navigate to confirm purchase which will handle it
    navigate("/store-item", {
      state: {
        for: "giftcards-confirm-purchase",
        quantity: numberOfGiftCards,
        price: selectedDenomination,
        productId: selectedItem.id,
        email: email,
        selectedItem: selectedItem,
      },
    });
  }

  if (!selectedItem) {
    return (
      <div className="giftCardsContainer">
        <CustomSettingsNavBar customBackFunction={() => navigate(-1)} />
        <FullLoadingScreen showLoadingIcon={false} text="No gift card selected" />
      </div>
    );
  }

  return (
    <div className="giftCardsContainer">
      <CustomSettingsNavBar customBackFunction={() => navigate(-1)} />

      <div className="expandedGiftCardScroll">
        {/* Header */}
        <div className="expandedGiftCardHeader">
          <div className="expandedGiftCardLogoContainer">
            <img
              className="expandedGiftCardLogo"
              src={selectedItem.logo}
              alt={selectedItem.name}
            />
          </div>
          <ThemeText
            textContent={selectedItem.name}
            textStyles={{
              fontSize: 22,
              textAlign: "center",
              fontWeight: "500",
            }}
          />
        </div>

        {/* Amount Selection */}
        <div className="expandedGiftCardSection">
          <ThemeText
            textContent={t("apps.giftCards.expandedGiftCardPage.selectamount")}
            textStyles={{ opacity: 0.8, marginBottom: 12 }}
          />
          <div
            className="expandedGiftCardCard"
            style={{ backgroundColor: backgroundOffset }}
          >
            {selectedItem.denominationType === "Variable" && (
              <div className="expandedGiftCardCustomAmountRow">
                <input
                  className="expandedGiftCardCustomInput"
                  style={{
                    backgroundColor: theme ? backgroundColor : Colors.dark.text,
                    color: theme ? Colors.dark.text : Colors.light.text,
                    borderColor:
                      !canPurchaseCard && selectedDenomination
                        ? theme && darkModeType
                          ? Colors.dark.text
                          : Colors.constants.cancelRed
                        : "transparent",
                  }}
                  type="number"
                  value={selectedDenomination}
                  onChange={(e) => setSelectedDenomination(e.target.value)}
                  placeholder={`${selectedItem.denominations[0]} ${selectedItem.currency} - ${selectedItem.denominations[1]} ${selectedItem.currency}`}
                />
                {!canPurchaseCard && !!selectedDenomination && (
                  <p
                    style={{
                      fontSize: 12,
                      textAlign: "center",
                      color:
                        theme && darkModeType
                          ? Colors.dark.text
                          : Colors.constants.cancelRed,
                      margin: "8px 0 0",
                    }}
                  >
                    {t(
                      "apps.giftCards.expandedGiftCardPage.minMaxPurchaseAmount",
                      {
                        min:
                          Number(selectedDenomination) <= variableRange[0]
                            ? "min"
                            : "max",
                        max:
                          Number(selectedDenomination) <= variableRange[0]
                            ? variableRange[0]
                            : variableRange[1],
                        currency: selectedItem.currency,
                      }
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="expandedGiftCardDenominationGrid">
              {denominationArray.map((item) => {
                const isSelected = String(selectedDenomination) === String(item);
                return (
                  <button
                    key={item}
                    className="denominationChip"
                    style={{
                      backgroundColor: isSelected
                        ? theme && darkModeType
                          ? Colors.dark.text
                          : primaryColor
                        : theme
                        ? backgroundColor
                        : Colors.dark.text,
                      color: isSelected
                        ? theme && darkModeType
                          ? Colors.light.text
                          : Colors.dark.text
                        : theme
                        ? Colors.dark.text
                        : Colors.light.text,
                      fontWeight: isSelected ? "500" : "400",
                    }}
                    onClick={() => setSelectedDenomination(String(item))}
                  >
                    {item} {selectedItem.currency}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Email Section */}
        <div className="expandedGiftCardSection">
          <ThemeText
            textContent={t("apps.giftCards.expandedGiftCardPage.sendingto")}
            textStyles={{ opacity: 0.8, marginBottom: 12 }}
          />
          <div
            className="expandedGiftCardCard"
            style={{ backgroundColor: backgroundOffset }}
          >
            <input
              className="expandedGiftCardEmailInput"
              style={{
                backgroundColor: theme ? backgroundColor : Colors.dark.text,
                color: theme ? Colors.dark.text : Colors.light.text,
                borderColor:
                  !EMAIL_REGEX.test(email) && email !== ""
                    ? theme && darkModeType
                      ? Colors.dark.text
                      : Colors.constants.cancelRed
                    : "transparent",
              }}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                "apps.giftCards.expandedGiftCardPage.emailPlaceholder"
              )}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Purchase Button */}
        <div className="expandedGiftCardPurchaseRow">
          <CustomButton
            textContent={t(
              "apps.giftCards.expandedGiftCardPage.purchaseBTN"
            )}
            actionFunction={handlePurchase}
            buttonStyles={{ width: "100%" }}
          />
        </div>

        {/* Terms */}
        {selectedItem.terms && (
          <div className="expandedGiftCardTermsSection">
            <ThemeText
              textContent={t("apps.giftCards.expandedGiftCardPage.terms")}
              textStyles={{ fontSize: 18, textAlign: "center", marginBottom: 24 }}
            />
            {isTermsHTML ? (
              <CustomButton
                textContent={t(
                  "apps.giftCards.expandedGiftCardPage.cardTerms"
                )}
                actionFunction={() =>
                  window.open(selectedItem.terms, "_blank")
                }
                buttonStyles={{
                  width: "70%",
                  margin: "0 auto",
                  backgroundColor: "transparent",
                  border: `1px solid ${primaryColor}`,
                }}
                textStyles={{ color: primaryColor }}
              />
            ) : (
              <div
                className="expandedGiftCardTermsBox"
                style={{ backgroundColor: backgroundOffset }}
              >
                <ThemeText
                  textContent={selectedItem.terms}
                  textStyles={{ fontSize: 13, lineHeight: "1.5", opacity: 0.8 }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
