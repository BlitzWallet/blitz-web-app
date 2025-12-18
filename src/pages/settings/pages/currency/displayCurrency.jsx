import { useEffect, useMemo, useState } from "react";
import CustomInput from "../../../../components/customInput/customInput";
import "./style.css";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import CheckCircle from "../../../../components/checkCircle/checkCircle";
import { Colors } from "../../../../constants/theme";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import { useLocation, useNavigate } from "react-router-dom";
import { getLiquidSdk } from "../../../../functions/connectToLiquid";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import ThemeText from "../../../../components/themeText/themeText";
import { fiatCurrencies } from "../../../../functions/currencyOptions";
import { useKeysContext } from "../../../../contexts/keysContext";
import loadNewFiatData from "../../../../functions/saveAndUpdateFiatData";
import { useOverlay } from "../../../../contexts/overlayContext";

export default function DisplayCurrency() {
  const { openOverlay } = useOverlay();
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { theme, darkModeType } = useThemeContext();
  const { toggleFiatStats } = useNodeContext();
  const [textInput, setTextInput] = useState("");
  const currentCurrency = masterInfoObject?.fiatCurrency;

  const [isSaving, setIsSaving] = useState(false);

  const { backgroundColor } = useThemeColors();
  const navigate = useNavigate();
  const location = useLocation();

  const currencies = useMemo(() => {
    return fiatCurrencies.sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  const filteredList = currencies.filter((currency) => {
    if (
      currency.info.name.toLowerCase().startsWith(textInput.toLowerCase()) ||
      currency.id.toLowerCase().startsWith(textInput.toLowerCase())
    )
      return currency;
    else return false;
  });

  const fiatCurrencyElements = filteredList.map((currency, id) => (
    <FiatCurrencyElement
      key={id}
      id={id}
      currency={currency}
      selectedFiatCurrency={currentCurrency || "USD"}
      toggleMasterInfoObject={toggleMasterInfoObject}
      navigate={navigate}
      location={location}
      setIsSaving={setIsSaving}
      // liquidSdk={liquidSdk}
      toggleFiatStats={toggleFiatStats}
      contactsPrivateKey={contactsPrivateKey}
      publicKey={publicKey}
      currentCurrency={currentCurrency}
      openOverlay={openOverlay}
    />
  ));

  return (
    <div id="displayCurrencyContainer">
      {isSaving ? (
        <FullLoadingScreen
          containerStyles={{ flex: 1, display: "flex" }}
          textStyles={{ marginTop: "10px" }}
          text={"Saving currency setting"}
        />
      ) : (
        <div className="fiatCurrencyElementContainer">
          <CustomInput
            containerStyles={{ backgroundColor: backgroundColor }}
            containerClassName={"displayCurrencyInputContainer"}
            textInputClassName={"displayCurrencyInput"}
            placeholder={"USD..."}
            value={textInput}
            onchange={setTextInput}
          />
          {fiatCurrencyElements}
        </div>
      )}
    </div>
  );
}

function FiatCurrencyElement({
  currency,
  id,
  selectedFiatCurrency,
  navigate,
  location,
  setIsSaving,
  // liquidSdk,
  toggleFiatStats,
  toggleMasterInfoObject,
  contactsPrivateKey,
  publicKey,
  currentCurrency,
  openOverlay,
}) {
  return (
    <div
      onClick={async () => {
        try {
          if (currentCurrency === currency.id) return;
          setIsSaving(true);
          const response = await loadNewFiatData(
            currency.id,
            contactsPrivateKey,
            publicKey,
            { fiatCurrency: currency.id }
          );

          if (!response.didWork) throw new Error("error saving fiat data");

          toggleFiatStats(response.fiatRateResponse);
          toggleMasterInfoObject({ fiatCurrency: currency.id });
        } catch (err) {
          openOverlay({
            for: "error",
            errorMessage: err.message,
          });
        } finally {
          setIsSaving(false);
        }
      }}
      className="fiatCurrencyElement"
    >
      <CheckCircle
        isActive={
          currency.id.toLowerCase() === selectedFiatCurrency.toLowerCase()
        }
        containerSize={30}
      />
      <div className="nameContainer">
        <ThemeText textContent={currency.info.name} />
        <ThemeText textContent={currency.id} />
      </div>
    </div>
  );
}
