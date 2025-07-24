import { useEffect, useState } from "react";
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
const TEST_FIAT_DATA = [
  {
    id: "AED",
    info: {
      name: "UAE Dirham",
      fractionSize: 2,
      symbol: {
        grapheme: "د.إ",
        template: "1 $",
        rtl: true,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "ANG",
    info: {
      name: "Netherlands Antillean Guilder",
      fractionSize: 2,
      symbol: {
        grapheme: "ƒ",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "NAƒ",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "ARS",
    info: {
      name: "Peso Argentino",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "AUD",
    info: {
      name: "Australian Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "A$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "BGN",
    info: {
      name: "Bulgarian Lev",
      fractionSize: 2,
      symbol: {
        grapheme: "лв",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "лв",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "BOB",
    info: {
      name: "Boliviano",
      fractionSize: 2,
      symbol: {
        grapheme: "Bs.",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Bs.",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "BRL",
    info: {
      name: "Real",
      fractionSize: 2,
      symbol: {
        grapheme: "R$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "R$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CAD",
    info: {
      name: "Canadian Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "CA$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CHF",
    info: {
      name: "Swiss Franc",
      fractionSize: 2,
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CLP",
    info: {
      name: "Peso Chileno",
      fractionSize: 0,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CNY",
    info: {
      name: "Yuan Renminbi",
      fractionSize: 2,
      symbol: {
        grapheme: "元",
        template: "1 $",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "元",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "COP",
    info: {
      name: "Peso Colombiano",
      fractionSize: 0,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CRC",
    info: {
      name: "Cost Rican Colon",
      fractionSize: 2,
      symbol: {
        grapheme: "₡",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₡",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "CZK",
    info: {
      name: "Czech Koruna",
      fractionSize: 2,
      symbol: {
        grapheme: "Kč",
        template: "1 $",
        rtl: false,
        position: 1,
      },
      uniqSymbol: {
        grapheme: "Kč",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "DKK",
    info: {
      name: "Danish Krone",
      fractionSize: 2,
      symbol: {
        grapheme: "kr.",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "DOP",
    info: {
      name: "Peso Dominicano",
      fractionSize: 2,
      symbol: {
        grapheme: "RD$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "RD$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "EUR",
    info: {
      name: "Euro",
      fractionSize: 2,
      spacing: 1,
      symbol: {
        grapheme: "€",
        rtl: false,
        position: 1,
      },
      uniqSymbol: {
        grapheme: "€",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [
        {
          locale: "de-AT",
          symbol: {
            position: 0,
          },
        },
        {
          locale: "el-CY",
          spacing: 0,
          symbol: {
            position: 0,
          },
        },
        {
          locale: "en",
          spacing: 0,
          symbol: {
            position: 0,
          },
        },
        {
          locale: "nl",
          symbol: {
            position: 0,
          },
        },
        {
          locale: "tr",
          spacing: 0,
          symbol: {
            position: 0,
          },
        },
      ],
    },
  },
  {
    id: "GBP",
    info: {
      name: "Pound Sterling",
      fractionSize: 2,
      spacing: 0,
      symbol: {
        grapheme: "£",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "£",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "GTQ",
    info: {
      name: "Quetzal",
      fractionSize: 2,
      symbol: {
        grapheme: "Q",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Q",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "HKD",
    info: {
      name: "Hong Kong Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "HK$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "HK$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "HNL",
    info: {
      name: "Lempira",
      fractionSize: 2,
      symbol: {
        grapheme: "L",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "L",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "HUF",
    info: {
      name: "Forint",
      fractionSize: 0,
      symbol: {
        grapheme: "Ft",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Ft",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "IDR",
    info: {
      name: "Rupiah",
      fractionSize: 2,
      symbol: {
        grapheme: "Rp",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Rp",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "ILS",
    info: {
      name: "New Israeli Shekel",
      fractionSize: 2,
      symbol: {
        grapheme: "₪",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₪",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "INR",
    info: {
      name: "Indian Rupee",
      fractionSize: 2,
      symbol: {
        grapheme: "₹",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₹",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "JMD",
    info: {
      name: "Jamaican Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "J$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "J$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "JPY",
    info: {
      name: "円",
      fractionSize: 0,
      symbol: {
        grapheme: "¥",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "¥",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "KES",
    info: {
      name: "Kenyan Shilling",
      fractionSize: 2,
      symbol: {
        grapheme: "KSh",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "KSh",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "KRW",
    info: {
      name: "원",
      fractionSize: 0,
      symbol: {
        grapheme: "₩",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₩",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "LBP",
    info: {
      name: "Lebanese Pound",
      fractionSize: 2,
      symbol: {
        grapheme: "£",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: ".ل.ل",
        template: "1 $",
        rtl: true,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "MXN",
    info: {
      name: "Peso Mexicano",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "MYR",
    info: {
      name: "Malaysian Ringgit",
      fractionSize: 2,
      symbol: {
        grapheme: "RM",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "RM",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "NAD",
    info: {
      name: "Namibia Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "N$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "NGN",
    info: {
      name: "Naira",
      fractionSize: 2,
      symbol: {
        grapheme: "₦",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₦",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "NOK",
    info: {
      name: "Norwegian Krone",
      fractionSize: 2,
      symbol: {
        grapheme: "kr",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "NZD",
    info: {
      name: "New Zealand Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "NZ$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PAB",
    info: {
      name: "Balboa",
      fractionSize: 2,
      symbol: {
        grapheme: "B/.",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "B/.",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PEN",
    info: {
      name: "Sol",
      fractionSize: 2,
      symbol: {
        grapheme: "S/",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "S/",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PHP",
    info: {
      name: "Piso",
      fractionSize: 2,
      symbol: {
        grapheme: "₱",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₱",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PKR",
    info: {
      name: "Pakistan Rupee",
      fractionSize: 2,
      symbol: {
        grapheme: "₨",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PLN",
    info: {
      name: "Zloty",
      fractionSize: 2,
      symbol: {
        grapheme: "zł",
        rtl: false,
        position: 1,
      },
      uniqSymbol: {
        grapheme: "zł",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "PYG",
    info: {
      name: "Guaraní",
      fractionSize: 0,
      symbol: {
        grapheme: "Gs",
        template: "1$",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Gs",
        template: "1$",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "RON",
    info: {
      name: "Romanian Leu",
      fractionSize: 2,
      symbol: {
        grapheme: "lei",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "lei",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "RUB",
    info: {
      name: "Russian Ruble",
      fractionSize: 2,
      symbol: {
        grapheme: "₽",
        template: "1 $",
        rtl: false,
        position: 1,
      },
      uniqSymbol: {
        grapheme: "₽",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "SEK",
    info: {
      name: "Swedish Krona",
      fractionSize: 2,
      symbol: {
        grapheme: "kr",
        template: "1 $",
        rtl: false,
        position: 1,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "SGD",
    info: {
      name: "Singapore Dollar",
      fractionSize: 2,
      spacing: 0,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "S$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "THB",
    info: {
      name: "Baht",
      fractionSize: 2,
      symbol: {
        grapheme: "฿",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "฿",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "TRY",
    info: {
      name: "Turkish Lira",
      fractionSize: 2,
      symbol: {
        grapheme: "₺",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "₺",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "TTD",
    info: {
      name: "Trinidad and Tobago Dollar",
      fractionSize: 2,
      symbol: {
        grapheme: "TT$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "TT$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "TWD",
    info: {
      name: "New Taiwan Dollar",
      fractionSize: 0,
      symbol: {
        grapheme: "NT$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "NT$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "USD",
    info: {
      name: "US Dollar",
      fractionSize: 2,
      spacing: 0,
      symbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "$",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "UYU",
    info: {
      name: "Peso Uruguayo",
      fractionSize: 0,
      symbol: {
        grapheme: "$U",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "$U",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "VES",
    info: {
      name: "Bolivar Soberano",
      fractionSize: 2,
      symbol: {
        grapheme: "Bs",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "Bs",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "VND",
    info: {
      name: "Dong",
      fractionSize: 0,
      symbol: {
        grapheme: "₫",
        template: "1 $",
        rtl: false,
        position: 1,
      },
      uniqSymbol: {
        grapheme: "₫",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "XOF",
    info: {
      name: "CFA Franc BCEAO",
      fractionSize: 0,
      symbol: {
        grapheme: "CFA",
        template: "1 $",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "CFA",
        template: "1 $",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "ZAR",
    info: {
      name: "Rand",
      fractionSize: 2,
      symbol: {
        grapheme: "R",
        template: "$1",
        rtl: false,
      },
      uniqSymbol: {
        grapheme: "R",
        template: "$1",
        rtl: false,
      },
      localizedName: [],
      localeOverrides: [],
    },
  },
  {
    id: "ZMW",
    info: {
      name: "Zambian Kwacha",
      fractionSize: 2,
      localizedName: [],
      localeOverrides: [],
    },
  },
];
export default function DisplayCurrency() {
  const [isSaving, setIsSaving] = useState(false);
  const [liquidSdk, setLiquidSdk] = useState(null);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor } = useThemeColors();
  const [enteredCurrency, setEnteredCurrency] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleFiatStats } = useNodeContext();
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const selectedFiatCurrency = masterInfoObject.fiatCurrency;
  const fiatData = !masterInfoObject?.fiatCurrenciesList.length
    ? masterInfoObject?.fiatCurrenciesList
    : TEST_FIAT_DATA;

  useEffect(() => {
    const initSdk = async () => {
      try {
        const sdk = await getLiquidSdk();
        setLiquidSdk(sdk);
      } catch (err) {
        console.log("Error initializing Liquid SDK:", err);
      }
    };
    initSdk();
  }, []);

  const fiatCurrencyElements = fiatData
    .filter((item) => {
      return (
        item.id.toLowerCase().startsWith(enteredCurrency.toLowerCase()) ||
        item.info.name.toLowerCase().startsWith(enteredCurrency.toLowerCase())
      );
    })
    .map((currency, id) => (
      <FiatCurrencyElement
        key={id}
        id={id}
        currency={currency}
        selectedFiatCurrency={selectedFiatCurrency || "USD"}
        toggleMasterInfoObject={toggleMasterInfoObject}
        navigate={navigate}
        location={location}
        setIsSaving={setIsSaving}
        liquidSdk={liquidSdk}
        toggleFiatStats={toggleFiatStats}
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
        <>
          <CustomInput
            containerStyles={{ backgroundColor: backgroundColor }}
            containerClassName={"displayCurrencyInputContainer"}
            textInputClassName={"displayCurrencyInput"}
            placeholder={"USD..."}
            value={enteredCurrency}
            onchange={setEnteredCurrency}
          />
          <div className="fiatCurrencyElementContainer">
            {fiatCurrencyElements}
          </div>
        </>
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
  liquidSdk,
  toggleFiatStats,
  toggleMasterInfoObject,
}) {
  return (
    <div
      onClick={async () => {
        try {
          setIsSaving(true);
          if (!liquidSdk) {
            throw new Error("Liquid SDK is not initialized.");
          }
          const fiat = await liquidSdk.fetchFiatRates();
          const [fiatRate] = fiat.filter((rate) => {
            return rate.coin.toLowerCase() === currency.id.toLowerCase();
          });
          toggleFiatStats({ ...fiatRate });

          toggleMasterInfoObject({ fiatCurrency: currency.id.toUpperCase() });

          //also need to update fiat stats here
        } catch (err) {
          navigate("/error", {
            state: { errorMessage: err.message, background: location },
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
