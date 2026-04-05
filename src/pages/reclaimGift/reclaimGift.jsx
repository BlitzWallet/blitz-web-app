import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftsContext";

import { ArrowLeft, RotateCcw } from "lucide-react";
import CustomButton from "../../components/customButton/customButton";

import "./reclaimGift.css";

export default function ReclaimGift() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    backgroundOffset,
    backgroundColor,
    textColor,
    textInputBackground,
    textInputColor,
  } = useThemeColors();

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
        style={{ color: textColor }}
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <ArrowLeft size={24} strokeWidth={2.25} aria-hidden />
      </button>
      <p className="reclaimGift-topBarTitle" style={{ color: textColor }}>
        {t("screens.inAccount.giftPages.claimPage.reclaimButton")}
      </p>
      <div className="reclaimGift-topBarSpacer" />
    </div>
  );

  // ---- Empty state: no expired gifts ----
  if (!hasExpiredGift) {
    return (
      <div className="reclaimGift-container" style={{ backgroundColor }}>
        {header}

        <div className="reclaimGift-scrollContent">
          <div className="reclaimGift-centerContent">
            <div className="reclaimGift-emptyState">
              <div
                className="reclaimGift-iconCircle"
                style={{ backgroundColor: backgroundOffset }}
              >
                <RotateCcw size={36} color={textColor} strokeWidth={1.75} />
              </div>

              <p className="reclaimGift-mainTitle" style={{ color: textColor }}>
                {t("screens.inAccount.giftPages.reclaimPage.header")}
              </p>

              <p
                className="reclaimGift-mainDesc"
                style={{ color: textColor }}
              >
                {t(
                  "screens.inAccount.giftPages.reclaimPage.noReclaimsMessage",
                )}
              </p>
            </div>

            <div className="reclaimGift-bottomButtonArea">
              <CustomButton
                actionFunction={handleAdvancedMode}
                textContent={t(
                  "screens.inAccount.giftPages.reclaimPage.advancedModeBTN",
                )}
                buttonStyles={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Has expired gifts: link + dropdown ----
  return (
    <div className="reclaimGift-container" style={{ backgroundColor }}>
      {header}

      <div className="reclaimGift-scrollContent">
        <div className="reclaimGift-centerContent">
          <div
            className="reclaimGift-iconCircle reclaimGift-iconCircleLarge"
            style={{ backgroundColor: backgroundOffset }}
          >
            <RotateCcw size={40} color={textColor} strokeWidth={1.75} />
          </div>

          <p className="reclaimGift-mainTitle" style={{ color: textColor }}>
            {t("screens.inAccount.giftPages.reclaimPage.header")}
          </p>

          <p className="reclaimGift-mainDesc" style={{ color: textColor }}>
            {t("screens.inAccount.giftPages.reclaimPage.desc")}
          </p>

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

          <button
            type="button"
            className="reclaimGift-advancedLink"
            style={{ color: textColor }}
            onClick={handleAdvancedMode}
          >
            {t("screens.inAccount.giftPages.reclaimPage.advancedModeBTN")}
          </button>

          <div className="reclaimGift-claimButtonArea">
            <CustomButton
              actionFunction={handleClaimGift}
              textContent={t(
                "screens.inAccount.giftPages.reclaimPage.button",
              )}
              disabled={!enteredLink}
              buttonStyles={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
