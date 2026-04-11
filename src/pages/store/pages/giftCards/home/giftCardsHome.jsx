import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import ThemeText from "../../../../../components/themeText/themeText";
import FullLoadingScreen from "../../../../../components/fullLoadingScreen/fullLoadingScreen";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { Colors } from "../../../../../constants/theme";
import getGiftCardsList from "../giftCardAPI";
import "../style.css";
import BackArrow from "../../../../../components/backArrow/backArrow";
import CustomInput from "../../../../../components/customInput/customInput";
import { getFlagFromCode } from "../../../../../functions/apps/countryFlag";

export default function GiftCardsHome({ selectedCountry }) {
  const { decodedGiftCards, toggleGiftCardsList, giftCardsList } =
    useGlobalAppData();
  const { theme } = useThemeContext();
  const { backgroundOffset } = useThemeColors();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState("");
  const [giftCardSearch, setGiftCardSearch] = useState("");

  const userLocal =
    selectedCountry ||
    decodedGiftCards?.profile?.isoCode?.toUpperCase() ||
    "US";

  // Load gift cards on mount if not already loaded
  useEffect(() => {
    if (giftCardsList.length) return;
    async function loadGiftCards() {
      try {
        const giftCards = await getGiftCardsList();
        if (giftCards.statusCode === 400) {
          setErrorMessage(t("apps.giftCards.giftCardsPage.noCardsAvailable"));
          return;
        }
        toggleGiftCardsList(giftCards.body.giftCards);
      } catch (err) {
        console.log(err);
        setErrorMessage(t("apps.giftCards.giftCardsPage.noCardsAvailable"));
      }
    }
    loadGiftCards();
  }, []);

  const filteredGiftCards = useMemo(
    () =>
      giftCardsList.filter(
        (giftCard) =>
          giftCard.countries.includes(userLocal || "US") &&
          giftCard.name
            .toLowerCase()
            .startsWith(giftCardSearch.toLowerCase()) &&
          giftCard.paymentTypes.includes("Lightning") &&
          giftCard.denominations.length !== 0,
      ),
    [userLocal, giftCardSearch, giftCardsList],
  );

  const flagEmoji = getFlagFromCode({ code: userLocal });

  const isLoading = giftCardsList.length === 0 && !errorMessage;

  return (
    <div className="giftCardsContainer">
      {/* Top bar */}
      <div className="giftCardsTopBar">
        <BackArrow backFunction={() => navigate("/store")} />
        <button
          className="giftCardsIconBtn"
          onClick={() =>
            navigate("/store-item", {
              state: { for: "giftcards-countries" },
            })
          }
          aria-label="Select country"
        >
          <ThemeText
            textStyles={{ fontSize: 20 }}
            textContent={flagEmoji || "🌐"}
          />
        </button>
        <button
          className="giftCardsIconBtn"
          style={{ marginLeft: 10 }}
          onClick={() =>
            navigate("/store-item", { state: { for: "giftcards-history" } })
          }
          aria-label="Purchase history"
        >
          <History
            size={22}
            color={theme ? Colors.dark.text : Colors.light.text}
          />
        </button>
      </div>

      {/* Search */}
      <div className="giftCardsSearchRow">
        <CustomInput
          containerStyles={{ maxWidth: "unset" }}
          placeholder={t("apps.giftCards.giftCardsPage.searchPlaceholder")}
          onchange={setGiftCardSearch}
          value={giftCardSearch}
        />
      </div>

      {/* Content */}
      <div className="giftCardsContent">
        {isLoading || errorMessage ? (
          <FullLoadingScreen
            showLoadingIcon={isLoading}
            text={
              errorMessage ||
              t("apps.giftCards.giftCardsPage.loadingCardsMessage")
            }
          />
        ) : filteredGiftCards.length === 0 ? (
          <FullLoadingScreen
            showLoadingIcon={false}
            text={t("apps.giftCards.giftCardsPage.noCardsAvailable")}
          />
        ) : (
          <div className="giftCardsGrid">
            {filteredGiftCards.map((item) => (
              <GiftCardGridItem key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GiftCardGridItem({ item, navigate }) {
  const isVariable =
    item.denominationType === "Variable" && item.denominations.length >= 2;

  const priceLabel = isVariable
    ? `${item.denominations[0]} - ${item.denominations[item.denominations.length - 1]} ${item.currency}`
    : `${item.denominations[0]} ${item.currency}`;

  return (
    <button
      className="giftCardGridItem"
      onClick={() =>
        navigate("/store-item", {
          state: { for: "giftcards-expanded", giftCard: item },
        })
      }
    >
      <div className="giftCardLogoContainer">
        <img
          className="giftCardLogo"
          src={item.logo}
          alt={item.name}
          loading="lazy"
        />
      </div>
      <div className="giftCardTitleContainer">
        <ThemeText
          textContent={item.name}
          textStyles={{
            fontWeight: "500",
            fontSize: 12,
            textAlign: "center",
            margin: 0,
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
          }}
        />
        <ThemeText
          textContent={priceLabel}
          textStyles={{
            fontSize: 11,
            textAlign: "center",
            opacity: 0.8,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
          }}
        />
      </div>
    </button>
  );
}
