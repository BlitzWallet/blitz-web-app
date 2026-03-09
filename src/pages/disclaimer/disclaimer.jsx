import "./style.css";
import { useLocation, useNavigate } from "react-router-dom";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ThemeText from "../../components/themeText/themeText";
import PageNavBar from "../../components/navBar/navBar";
import { useOverlay } from "../../contexts/overlayContext";
import {
  Lock,
  KeyRound,
  TriangleAlert,
  Check,
  ShieldCheck,
} from "lucide-react";

// ─── Info rows config (mirrors RN's inlined array) ───────────────────────────
const INFO_ROWS = [
  {
    Icon: Lock,
    labelKey: "createAccount.disclaimerPage.row1Label",
    descKey: "createAccount.disclaimerPage.row1Description",
  },
  {
    Icon: KeyRound,
    labelKey: "createAccount.disclaimerPage.row2Label",
    descKey: "createAccount.disclaimerPage.row2Description",
  },
  {
    Icon: TriangleAlert,
    labelKey: "createAccount.disclaimerPage.row3Label",
    descKey: "createAccount.disclaimerPage.row3Description",
  },
];

function DisclaimerPage() {
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const params = location.state;
  const nextPageName = params?.nextPageName;
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    e.preventDefault();
    e.stopPropagation();
    window.open("https://blitzwalletapp.com/pages/terms/", "_blank");
  };

  return (
    <div className="disclaimerContainer">
      <PageNavBar />

      {/* ── Scrollable content area ── */}
      <div className="disclaimerContentContainer">
        {/* ── Shield icon (mirrors RN's <IconActionCircle icon="ShieldCheck" />) ── */}
        <div className="shieldIconWrap">
          <ShieldCheck size={28} color={Colors.light.blue} strokeWidth={1.8} />
        </div>

        {/* ── Header ── */}
        <h1 className="disclaimerHeader">
          {t("createAccount.disclaimerPage.header")}
        </h1>
        <p className="disclaimerSubHeader">
          {t("createAccount.disclaimerPage.subHeader")}
        </p>

        {/* ── Info rows (mirrors RN's infoContainer) ── */}
        <div className="infoContainer">
          {INFO_ROWS.map(({ Icon: RowIcon, labelKey, descKey }) => (
            <div key={labelKey} className="infoRow">
              <div className="infoIconWrap">
                <RowIcon size={15} color={Colors.dark.text} strokeWidth={2} />
              </div>
              <div className="infoText">
                <ThemeText
                  textStyles={{
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    margin: 0,
                  }}
                  textContent={t(labelKey)}
                />
                <ThemeText
                  textStyles={{ fontSize: "0.8rem", margin: 0, opacity: 0.65 }}
                  textContent={t(descKey)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Checkbox + inline T&C sentence (mirrors RN's checkboxContainer) ── */}
      <div
        className="termsAndConditions"
        onClick={() => setTermsAccepted((prev) => !prev)}
      >
        <div
          className="termsAndConditionsCheckbox"
          style={{
            backgroundColor: termsAccepted ? Colors.light.blue : "transparent",
            borderColor: termsAccepted ? Colors.light.blue : Colors.light.text,
          }}
        >
          {termsAccepted && (
            <Check size={12} color={Colors.dark.text} strokeWidth={3} />
          )}
        </div>

        {/*
          Mirrors RN's inline <Text> pattern:
            acceptPrefix + tappable termsLink + acceptSuffix
        */}
        <p className="checkboxText">
          {t("createAccount.disclaimerPage.acceptPrefix")}{" "}
          <a
            className="termsLink"
            href="https://blitzwalletapp.com/pages/terms/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={openTermsAndConditions}
          >
            {t("createAccount.disclaimerPage.terms&Conditions")}
          </a>{" "}
          {t("createAccount.disclaimerPage.acceptSuffix")}
        </p>
      </div>

      {/* ── CTA ── */}
      <CustomButton
        actionFunction={nextPage}
        textStyles={{ color: Colors.dark.text }}
        buttonStyles={{
          backgroundColor: Colors.light.blue,
          opacity: termsAccepted ? 1 : 0.5,
          width: "100%",
        }}
        textContent={t("createAccount.disclaimerPage.continueBTN")}
      />
    </div>
  );
}

export default DisclaimerPage;
