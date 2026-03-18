import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../../components/themeText/themeText";
import FullLoadingScreen from "../../../../../components/fullLoadingScreen/fullLoadingScreen";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { Colors } from "../../../../../constants/theme";
import { Globe } from "lucide-react";
import "../style.css";
import CustomInput from "../../../../../components/customInput/customInput";
import "flag-icons/css/flag-icons.min.css";
import CheckCircle from "../../../../../components/checkCircle/checkCircle";
import {
  COUNTRY_LIST,
  getFlagFromCode,
} from "../../../../../functions/apps/countryFLag";

export default function CountriesList({ onlyReturn, returnTo }) {
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { toggleGlobalAppDataInformation, decodedGiftCards } =
    useGlobalAppData();
  const { textColor, backgroundOffset } = useThemeColors();
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const didClick = useRef(false);
  const ISOCode = decodedGiftCards?.profile?.isoCode;

  const countries = COUNTRY_LIST.filter((item) =>
    item.name.toLowerCase().startsWith(searchInput.toLowerCase()),
  );

  const allCountries = onlyReturn
    ? [{ code: "WW", name: "World Wide" }, ...countries]
    : countries;

  const saveNewCountrySetting = useCallback(
    async (isoCode) => {
      if (didClick.current) return;
      didClick.current = true;

      if (onlyReturn && returnTo) {
        // Navigate to the return destination with selectedCountry in state
        navigate("/store-item", {
          state: { for: returnTo, selectedCountry: isoCode },
        });
        return;
      }

      try {
        const em = await encryptMessage(
          contactsPrivateKey,
          publicKey,
          JSON.stringify({
            ...decodedGiftCards,
            profile: {
              ...decodedGiftCards?.profile,
              isoCode: isoCode,
            },
          }),
        );
        toggleGlobalAppDataInformation({ giftCards: em }, true);
      } catch (err) {
        console.log("save country error", err);
      }

      navigate(-1);
      didClick.current = false;
    },
    [
      contactsPrivateKey,
      publicKey,
      decodedGiftCards,
      toggleGlobalAppDataInformation,
      navigate,
      onlyReturn,
      returnTo,
    ],
  );

  return (
    <div className="giftCardsContainer">
      <CustomSettingsNavBar
        containerStyles={{ marginBottom: 20 }}
        customBackFunction={() => navigate(-1)}
      />

      <CustomInput
        onchange={setSearchInput}
        value={searchInput}
        containerStyles={{ maxWidth: "90%" }}
        placeholder={t("apps.chatGPT.countrySearch.inputPlaceholder")}
      />

      <div className="countriesList">
        {allCountries.map((item) => {
          const isSelected = ISOCode === item.code && !onlyReturn;
          const flag = getFlagFromCode({ code: item.code, size: 23 });
          return (
            <button
              key={item.code}
              className="countryRow"
              onClick={() => saveNewCountrySetting(item.code)}
            >
              <CheckCircle isActive={isSelected} containerSize={23} />

              <div style={{ marginLeft: 10 }}>
                {item.code === "WW" ? (
                  <div
                    className="countryGlobePlaceholder"
                    style={{ backgroundColor: backgroundOffset }}
                  >
                    <Globe size={20} color={textColor} />
                  </div>
                ) : (
                  flag
                )}
              </div>
              <ThemeText
                textContent={item.name}
                textStyles={{ fontWeight: "500", margin: 0, marginLeft: 10 }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
