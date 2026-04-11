import { useState } from "react";
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
import CustomInput from "../../../../../components/customInput/customInput";

export default function CreateAccount() {
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { theme, darkModeType } = useThemeContext();
  const { toggleGlobalAppDataInformation, decodedGiftCards } =
    useGlobalAppData();
  const { textColor } = useThemeColors();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasError, setHasError] = useState("");

  const primaryColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;

  async function createAGiftCardAccount() {
    try {
      if (!EMAIL_REGEX.test(email)) {
        navigate("/store-item", { state: { for: "giftcards" }, replace: true });
        return;
      }
      setIsSigningIn(true);
      const em = await encryptMessage(
        contactsPrivateKey,
        publicKey,
        JSON.stringify({
          ...decodedGiftCards,
          profile: {
            ...decodedGiftCards?.profile,
            email: email,
          },
        }),
      );
      toggleGlobalAppDataInformation({ giftCards: em }, true);
      navigate("/store-item", { state: { for: "giftcards" }, replace: true });
    } catch (err) {
      setHasError(t("errormessages.nointernet"));
      console.log("create gift card account error", err);
    }
  }

  return (
    <div className="giftCardsContainer">
      <CustomSettingsNavBar />

      <div className="createAccountBody">
        {isSigningIn ? (
          <>
            <FullLoadingScreen
              showLoadingIcon={!hasError}
              text={hasError || "Saving email"}
              textStyles={{ textAlign: "center" }}
            />
            {hasError && (
              <CustomButton
                textContent="Try again"
                actionFunction={() => {
                  setIsSigningIn(false);
                  setHasError("");
                }}
                buttonStyles={{ width: "auto", margin: "0 auto 10px" }}
              />
            )}
          </>
        ) : (
          <>
            <div className="createAccountScrollArea">
              <ThemeText
                textContent={t("apps.giftCards.createAccount.title")}
                textStyles={{
                  color: primaryColor,
                  fontSize: 22,
                  fontWeight: "500",
                  marginBottom: 0,
                  textAlign: "center",
                }}
              />

              <div className="createAccountLogoPlaceholder">
                <ThemeText
                  textContent="The Bitcoin Company"
                  textStyles={{
                    color: primaryColor,
                    fontSize: 18,
                    fontWeight: "600",
                    textAlign: "center",
                    margin: 0,
                  }}
                />
              </div>

              <ThemeText
                textContent={t("apps.giftCards.createAccount.saveEmail")}
                textStyles={{
                  textAlign: "center",
                  marginBottom: 0,
                  width: "90%",
                }}
              />
              <CustomInput
                containerStyles={{ maxWidth: "unset" }}
                containerClassName="createAccountEmailInput"
                textInputClassName="createAccountEmailInput"
                onchange={setEmail}
                value={email}
                placeholder="email@address.com"
                type="email"
              />
            </div>

            <CustomButton
              textContent={t("constants.continue")}
              actionFunction={createAGiftCardAccount}
              buttonStyles={{ width: "auto", margin: "auto auto 10px" }}
            />

            <div className="createAccountTerms">
              <p
                style={{
                  color: textColor,
                  fontSize: 12,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {t("apps.giftCards.createAccount.termsAndConditions1")}{" "}
                <span
                  className="createAccountLink"
                  style={{ color: primaryColor }}
                  onClick={() =>
                    window.open(
                      "https://thebitcoincompany.com/gift-card-shopping-terms.html",
                      "_blank",
                    )
                  }
                >
                  {t("apps.giftCards.createAccount.termsAndConditions2")}
                </span>{" "}
                {t("apps.giftCards.createAccount.termsAndConditions3")}{" "}
                <span
                  className="createAccountLink"
                  style={{ color: primaryColor }}
                  onClick={() =>
                    window.open(
                      "https://thebitcoincompany.com/privacy",
                      "_blank",
                    )
                  }
                >
                  {t("apps.giftCards.createAccount.termsAndConditions4")}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
