import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftsContext";

import { ArrowLeft, RotateCcw } from "lucide-react";
import CustomButton from "../../components/customButton/customButton";
import ThemeText from "../../components/themeText/themeText";

import "./reclaimGift.css";

const PRIMARY_BLUE = Colors.constants.blue;

export default function ReclaimGift() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();

  const {
    backgroundOffset,
    backgroundColor,
    textInputBackground,
    textInputColor,
  } = useThemeColors();

  const inputPlaceholderColor =
    theme && !darkModeType
      ? Colors.constants.darkModeTextInputPlaceholder
      : "#767676";

  const { expiredGiftsArray } = useGifts();

  const [enteredLink, setEnteredLink] = useState("");

  const dropdownData = useMemo(() => {
    if (!expiredGiftsArray || !expiredGiftsArray.length) return [];
    return expiredGiftsArray.map((item) => ({
      label: item.uuid,
      value: item.uuid,
      data: item,
    }));
  }, [expiredGiftsArray]);

  const hasExpiredGift = !!dropdownData.length;

  const selectValue = useMemo(() => {
    if (!enteredLink) return "";
    return dropdownData.some((o) => o.value === enteredLink)
      ? enteredLink
      : "";
  }, [enteredLink, dropdownData]);

  function handleClaimGift() {
    if (!enteredLink) return;
    const url = enteredLink;
    setEnteredLink("");
    navigate("/claim-gift", {
      state: { claimType: "reclaim", url },
    });
  }

  function handleDropdownSelection(e) {
    const selectedValue = e.target.value;
    if (!selectedValue) return;
    const selected = dropdownData.find((opt) => opt.value === selectedValue);
    if (!selected) return;
    setEnteredLink(selected.data.uuid);
  }

  function handleAdvancedMode() {
    navigate("/advanced-gift-claim");
  }

  const header = (
    <div className="reclaimGift-topBar">
      <button
        type="button"
        className="reclaimGift-backBtn"
        onClick={() => navigate(-1)}
        aria-label={t("constants.back")}
      >
        <ArrowLeft size={24} strokeWidth={2.25} aria-hidden color={PRIMARY_BLUE} />
      </button>
      <ThemeText
        className="reclaimGift-title"
        textContent={t("screens.inAccount.giftPages.claimPage.reclaimButton")}
        textStyles={{
          flex: 1,
          minWidth: 0,
          fontSize: "18px",
          fontWeight: 600,
          textAlign: "center",
          margin: 0,
        }}
      />
      <div className="reclaimGift-topBarSpacer" />
    </div>
  );

  const iconAction = (
    <div className="reclaimGift-iconAction" aria-hidden>
      <RotateCcw size={40} color={PRIMARY_BLUE} strokeWidth={1.75} />
    </div>
  );

  const mainTitle = (
    <ThemeText
      className="reclaimGift-mainTitle"
      textContent={t("screens.inAccount.giftPages.reclaimPage.header")}
      textStyles={{
        fontSize: "22px",
        fontWeight: 600,
        textAlign: "center",
        margin: "0 0 12px",
      }}
    />
  );

  // ---- Empty state: no expired gifts ----
  if (!hasExpiredGift) {
    return (
      <div
        className="reclaimGift-container"
        style={{
          backgroundColor,
          ["--reclaim-placeholder"]: inputPlaceholderColor,
        }}
      >
        {header}

        <div className="reclaimGift-scrollContent">
          <div className="reclaimGift-centerContent">
            <div className="reclaimGift-emptyState">
              {iconAction}

              {mainTitle}

              <ThemeText
                className="reclaimGift-mainDesc"
                textContent={t(
                  "screens.inAccount.giftPages.reclaimPage.noReclaimsMessage",
                )}
                textStyles={{
                  fontSize: "13px",
                  textAlign: "center",
                  margin: "0 0 32px",
                  maxWidth: 384,
                  lineHeight: "20px",
                  opacity: 0.6,
                }}
              />
            </div>

            <div className="reclaimGift-bottomButtonArea">
              <CustomButton
                actionFunction={handleAdvancedMode}
                textContent={t(
                  "screens.inAccount.giftPages.reclaimPage.advancedModeBTN",
                )}
                buttonStyles={{ width: "100%", maxWidth: 448 }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Has expired gifts: link + dropdown ----
  return (
    <div
      className="reclaimGift-container"
      style={{
        backgroundColor,
        ["--reclaim-placeholder"]: inputPlaceholderColor,
      }}
    >
      {header}

      <div className="reclaimGift-scrollContent">
        <div className="reclaimGift-centerContent">
          {iconAction}

          {mainTitle}

          <ThemeText
            className="reclaimGift-mainDesc"
            textContent={t("screens.inAccount.giftPages.reclaimPage.desc")}
            textStyles={{
              fontSize: "13px",
              textAlign: "center",
              margin: "0 0 32px",
              maxWidth: 384,
              lineHeight: "20px",
              opacity: 0.6,
            }}
          />

          <div
            className="reclaimGift-formCard"
            style={{ backgroundColor: backgroundOffset }}
          >
            <input
              className="reclaimGift-input"
              value={enteredLink}
              onChange={(e) => setEnteredLink(e.target.value)}
              placeholder={t(
                "screens.inAccount.giftPages.reclaimPage.inputPlaceholder",
              )}
              onKeyDown={(e) => e.key === "Enter" && handleClaimGift()}
              style={{
                backgroundColor: textInputBackground,
                color: textInputColor,
                borderColor: backgroundColor,
                borderWidth: 1,
                borderStyle: "solid",
              }}
            />

            <div className="reclaimGift-dropdownWrapper">
              <select
                className="reclaimGift-select"
                value={selectValue}
                onChange={handleDropdownSelection}
                style={{
                  backgroundColor: textInputBackground,
                  color: textInputColor,
                  borderColor: backgroundColor,
                  borderWidth: 1,
                  borderStyle: "solid",
                }}
              >
                <option value="">
                  {t(
                    "screens.inAccount.giftPages.reclaimPage.dropdownPlaceHolder",
                  )}
                </option>
                {dropdownData.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ThemeText
            className="reclaimGift-advancedLink"
            clickFunction={handleAdvancedMode}
            textContent={t(
              "screens.inAccount.giftPages.reclaimPage.advancedModeBTN",
            )}
            textStyles={{
              fontSize: "14px",
              textDecoration: "underline",
              cursor: "pointer",
              marginTop: "20px",
              marginBottom: "20px",
              textAlign: "center",
              width: "100%",
            }}
          />

          <div className="reclaimGift-claimButtonArea">
            <CustomButton
              actionFunction={handleClaimGift}
              textContent={t(
                "screens.inAccount.giftPages.reclaimPage.button",
              )}
              disabled={!enteredLink}
              buttonStyles={{ width: "100%", maxWidth: 448 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
