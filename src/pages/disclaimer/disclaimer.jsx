import "./style.css";
import { useLocation, useNavigate } from "react-router-dom";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ThemeText from "../../components/themeText/themeText";
import Icon from "../../components/customIcon/customIcon";
import PageNavBar from "../../components/navBar/navBar";
import { disclaimerKeys } from "../../constants/icons";
function DisclaimerPage({ openOverlay }) {
  const location = useLocation();
  const params = location.state;
  const nextPageName = params?.nextPageName;
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false); // Add acceptance state
  const { t } = useTranslation();

  const nextPage = () => {
    if (!termsAccepted) {
      openOverlay({
        for: "error",
        errorMessage: t("createAccount.disclaimerPage.acceptError"),
      });
      return;
    }
    navigate(nextPageName);
  };

  const openTermsAndConditions = (e) => {
    console.log("test");
    console.log(e);

    if (e) {
      e.preventDefault(); // Stops default browser behavior
      e.stopPropagation(); // Stops event from bubbling up to parent elements
    }

    // Remove the early return!
    window.open("https://blitzwalletapp.com/pages/terms/", "_blank");
  };
  const toggleTermsAcceptance = () => {
    setTermsAccepted(!termsAccepted);
  };

  return (
    <div className="disclaimerContainer">
      <PageNavBar />
      <div className="disclaimerContentContainer">
        <h1>{t("createAccount.disclaimerPage.header")}</h1>
        <p className="recoveryText">
          {t("createAccount.disclaimerPage.subHeader")}
        </p>
        <div className="imgContainer">
          <img loading="lazy" src={disclaimerKeys} />
        </div>
        <p className="quoteText">
          {t("createAccount.disclaimerPage.imgCaption")}
        </p>

        <div onClick={toggleTermsAcceptance} className="termsAndConditions">
          <div
            style={{
              backgroundColor: termsAccepted
                ? Colors.constants.blue
                : "transparent",
              borderColor: termsAccepted
                ? Colors.constants.blue
                : Colors.light.text,
            }}
            className="termsAndConditionsCheckbox"
          >
            {termsAccepted && (
              <Icon
                width={10}
                height={10}
                color={Colors.dark.text}
                name={"expandedTxCheck"}
              />
            )}
          </div>
          <div className="termsTextContainer">
            <ThemeText
              textStyles={{ fontSize: "0.75rem", margin: 0, marginRight: 3 }}
              textContent={t("createAccount.disclaimerPage.acceptPrefix")}
            />{" "}
            <div onClick={openTermsAndConditions}>
              <ThemeText
                textStyles={{
                  fontSize: "0.75rem",
                  margin: 0,
                  color: "var(--primaryBlue)",
                }}
                className={"termsLink"}
                textContent={t("createAccount.disclaimerPage.terms&Conditions")}
              />
            </div>
          </div>
        </div>
        <CustomButton
          actionFunction={nextPage}
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={"Next"}
        />
      </div>
    </div>
  );
}

export default DisclaimerPage;
