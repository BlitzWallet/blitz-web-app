import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, Zap } from "lucide-react";
import ThemeText from "../../../../components/themeText/themeText";
import CustomButton from "../../../../components/customButton/customButton";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import CustomSettingsNavBar from "../../../../components/customSettingsNavbar";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useGlobalAppData } from "../../../../contexts/appDataContext";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Colors } from "../../../../constants/theme";
import Storage from "../../../../functions/localStorage";
import { SHOPS_DIRECTORY_KEY } from "../../../../constants";
import "./style.css";
import { getFlagFromCode } from "../../../../functions/apps/countryFlag";
import BackArrow from "../../../../components/backArrow/backArrow";
import CustomInput from "../../../../components/customInput/customInput";

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function OnlineListings({ removeUserLocal }) {
  const { decodedGiftCards } = useGlobalAppData();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [userLocal, setUserLocal] = useState("WW");
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const reTryCounter = useRef(0);

  // Handle country selection returned from countries list
  useEffect(() => {
    if (!removeUserLocal) return;
    Storage.setItem(SHOPS_DIRECTORY_KEY, removeUserLocal);
    setUserLocal(removeUserLocal);
  }, [removeUserLocal]);

  useEffect(() => {
    let mounted = true;
    const fetchListings = async () => {
      try {
        const [shopSavedLocation, res] = await Promise.all([
          Promise.resolve(Storage.getItem(SHOPS_DIRECTORY_KEY)),
          fetch("https://bitcoinlistings.org/.well-known/business"),
        ]);
        if (shopSavedLocation) {
          setUserLocal(shopSavedLocation);
        } else if (decodedGiftCards?.profile?.isoCode) {
          setUserLocal(decodedGiftCards.profile.isoCode);
        }
        const json = await res.json();
        if (!json.businesses && reTryCounter.current < 2) {
          reTryCounter.current += 1;
          fetchListings();
          return;
        }
        if (!mounted) return;
        setData(json);
      } catch (e) {
        console.error("Failed to fetch listings", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchListings();
    return () => {
      mounted = false;
    };
  }, []);

  const preprocessedBusinesses = useMemo(() => {
    if (!data?.businesses) return [];
    return Object.values(data.businesses)
      .map((biz) => ({
        ...biz,
        _name: biz.name.toLowerCase(),
        _description: biz.description?.toLowerCase() || "",
        _category: biz.category?.toLowerCase() || "",
        _countryCode: biz.country?.code?.toLowerCase() || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const categories = useMemo(() => {
    if (!data?.statistics?.categories) return [];
    const unique = Array.from(
      new Set(data.statistics.categories.map((c) => c.toLowerCase())),
    );
    return unique
      .map((c) => ({ label: t(`apps.onlineListings.${c}`), value: c }))
      .sort((a, b) => {
        if (a.value === "other") return 1;
        if (b.value === "other") return -1;
        return a.label.localeCompare(b.label);
      });
  }, [data?.statistics?.categories, t]);

  const businesses = useMemo(() => {
    if (!preprocessedBusinesses.length) return [];
    const query = debouncedSearch.toLowerCase();
    return preprocessedBusinesses.filter((biz) => {
      const matchSearch =
        !query || biz._name.includes(query) || biz._description.includes(query);
      const matchCategory =
        category === "All" || biz._category === category.toLowerCase();
      const matchLocation =
        userLocal === "WW" || biz._countryCode === userLocal.toLowerCase();
      const acceptsBitcoin =
        biz.payment_methods?.lightning || biz.payment_methods?.bitcoin_onchain;
      return matchSearch && matchCategory && matchLocation && acceptsBitcoin;
    });
  }, [preprocessedBusinesses, debouncedSearch, category, userLocal]);

  const flagEmoji = getFlagFromCode({ code: userLocal });
  const primaryColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;

  if (loading) {
    return (
      <div className="onlineListingsContainer" style={{ backgroundColor }}>
        <CustomSettingsNavBar
          text={t("apps.onlineListings.topBarLabel")}
          customBackFunction={() => navigate("/store")}
        />
        <FullLoadingScreen text={t("apps.onlineListings.loadingShopMessage")} />
      </div>
    );
  }

  return (
    <div className="onlineListingsContainer" style={{ backgroundColor }}>
      {/* Top Bar */}
      <div className="onlineListingsTopBar">
        <BackArrow backFunction={() => navigate("/store")} />

        <ThemeText
          className={"pageHeaderText"}
          textContent={t("apps.onlineListings.topBarLabel")}
        />
        <button
          className="onlineListingsCountryBtn"
          style={{
            backgroundColor:
              userLocal === "WW" ? backgroundOffset : "transparent",
            borderRadius: 8,
          }}
          onClick={() =>
            navigate("/store-item", {
              state: {
                for: "giftcards-countries",
                returnTo: "onlinelistings",
                onlyReturn: true,
              },
            })
          }
          aria-label="Select country"
        >
          <ThemeText
            textStyles={{ fontSize: 20 }}
            textContent={flagEmoji || "🌐"}
          />
        </button>
      </div>

      {/* Sticky Search + Filter */}
      <div className="onlineListingsStickyHeader" style={{ backgroundColor }}>
        <CustomInput
          containerStyles={{ maxWidth: "unset" }}
          value={search}
          onchange={setSearch}
          placeholder={t("apps.onlineListings.inputPlaceHolder")}
        />
      </div>

      {/* Category Filter */}
      <div className="onlineListingsCategoryRow" style={{ backgroundColor }}>
        <select
          className="onlineListingsCategorySelect"
          style={{
            backgroundColor: backgroundOffset,
            color: theme ? Colors.dark.text : Colors.light.text,
          }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="All">
            {t("apps.onlineListings.selectCategoryPlaceholder")}
          </option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Business List */}
      <div className="onlineListingsScroll">
        {businesses.length === 0 ? (
          <ThemeText
            textContent={t("apps.onlineListings.noBuisMessage")}
            textStyles={{ textAlign: "center", padding: "20px 0" }}
          />
        ) : (
          <div className="onlineListingsGrid">
            {businesses.map((item, index) => (
              <BusinessCard
                key={item.name + index}
                item={item}
                theme={theme}
                darkModeType={darkModeType}
                backgroundColor={backgroundColor}
                backgroundOffset={backgroundOffset}
                t={t}
                primaryColor={primaryColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add listing button */}
      <div className="onlineListingsFooter">
        <CustomButton
          textContent={t("apps.onlineListings.addListing")}
          actionFunction={() =>
            window.open("https://bitcoinlistings.org/submit", "_blank")
          }
          buttonStyles={{ width: "90%", maxWidth: 400 }}
        />
      </div>
    </div>
  );
}

function BusinessCard({
  item,
  theme,
  darkModeType,
  backgroundColor,
  backgroundOffset,
  t,
  primaryColor,
}) {
  const flagEmoji = getFlagFromCode({ code: item.country?.code });

  return (
    <div
      className="onlineListingsCard"
      style={{ backgroundColor: theme ? backgroundOffset : Colors.dark.text }}
    >
      <div className="onlineListingsCardHeader">
        {item.country?.code && item.country.code !== "WW" ? (
          <ThemeText
            textStyles={{ fontSize: 20, margin: 0 }}
            textContent={flagEmoji || "🌐"}
          />
        ) : (
          <div
            className="onlineListingsGlobePlaceholder"
            style={{ backgroundColor }}
          >
            <ThemeText
              textStyles={{ fontSize: 20, margin: 0 }}
              textContent={flagEmoji || "🌐"}
            />
          </div>
        )}
        <div className="onlineListingsCardInfo">
          <ThemeText
            textContent={item.name}
            textStyles={{ fontWeight: "500", margin: 0 }}
          />
          <ThemeText
            textContent={item.country?.name || ""}
            textStyles={{ fontSize: 12, opacity: 0.7, margin: 0 }}
          />
        </div>
        {item.payment_methods?.lightning && (
          <div
            className="onlineListingsLightningBadge"
            style={{
              backgroundColor:
                theme && darkModeType ? backgroundColor : primaryColor,
            }}
          >
            <Zap size={13} color={Colors.dark.text} fill={Colors.dark.text} />
          </div>
        )}
      </div>

      <div className="onlineListingsCategoryChip" style={{ backgroundColor }}>
        <ThemeText
          textContent={t(
            `apps.onlineListings.${item.category?.toLowerCase() || "other"}`,
          )}
          textStyles={{ fontSize: 12, margin: 0 }}
        />
      </div>

      <ThemeText
        textContent={item.description}
        textStyles={{ fontSize: 14, marginBottom: 10 }}
      />

      <button
        className="onlineListingsVisitBtn"
        style={{
          borderColor: theme ? Colors.dark.text : backgroundColor,
        }}
        onClick={() => window.open(item.website, "_blank")}
      >
        <ThemeText textStyles={{ fontSize: 15 }} textContent={"🌐"} />
        <ThemeText
          textContent={t("apps.onlineListings.visitWebsite")}
          textStyles={{ marginLeft: 5, margin: 0 }}
        />
      </button>
    </div>
  );
}
