import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import BackArrow from "../../../../../components/backArrow/backArrow";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import ConfirmationSlideUp from "../confirmationSlideUp/confirmationSlideUp";
import { sendCountryCodes } from "../constants/sendCountryCodes";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useToast } from "../../../../../contexts/toastManager";
import "../style.css";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import { getFlagFromCode } from "../../../../../functions/apps/countryFlag";

export default function SMS4SatsSendPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor, backgroundColor, backgroundOffset } = useThemeColors();
  const { showToast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(
    t("apps.sms4sats.sendPage.startingSendingMessage"),
  );

  const selectedAreaCode = useMemo(() => {
    return sendCountryCodes.filter(
      (item) => item.country.toLowerCase() === countrySearch.toLowerCase(),
    );
  }, [countrySearch]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return sendCountryCodes.slice(0, 30);
    return sendCountryCodes
      .filter((item) =>
        item.country.toLowerCase().startsWith(countrySearch.toLowerCase()),
      )
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [countrySearch]);

  const isExactCountryMatch = selectedAreaCode.length > 0;
  const canSubmit =
    phoneNumber.length > 0 && message.length > 0 && isExactCountryMatch;

  const handleSubmit = useCallback(() => {
    if (!phoneNumber) {
      showToast({
        message: t("apps.sms4sats.sendPage.invalidInputError", {
          errorType: "phone number",
        }),
        type: "error",
      });
      return;
    }
    if (!message) {
      showToast({
        message: t("apps.sms4sats.sendPage.invalidInputError", {
          errorType: "message",
        }),
        type: "error",
      });
      return;
    }
    if (!isExactCountryMatch) {
      showToast({
        message: t("apps.sms4sats.sendPage.invalidCountryError"),
        type: "error",
      });
      return;
    }
    setShowConfirm(true);
  }, [phoneNumber, message, isExactCountryMatch, showToast, t]);

  return (
    <div className="sms4sats-page">
      <CustomSettingsNavBar
        text={t("constants.send")}
        LeftImageIcon={Receipt}
        showLeftImage={true}
        leftImageFunction={() =>
          navigate("/store-item", {
            state: { for: "sms4sats-history", selectedPage: "send" },
          })
        }
      />

      {isSending ? (
        <div className="sms4sats-spinner">
          <div className="sms4sats-spinner-circle" />
          <ThemeText
            textContent={sendingMessage}
            textStyles={{ textAlign: "center" }}
          />
        </div>
      ) : (
        <div className="sms4sats-send-container">
          <ThemeText
            textContent={t(
              "apps.sms4sats.sendPage.phoneNumberInputDescription",
            )}
            textStyles={{ textAlign: "center", marginTop: 10 }}
          />
          <input
            type="tel"
            className="sms4sats-phone-input"
            style={{ backgroundColor: backgroundOffset, color: textColor }}
            value={phoneNumber}
            onChange={(e) =>
              setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 15))
            }
            placeholder="(123) 456-7891"
            maxLength={15}
          />

          <ThemeText
            textContent={t(
              "apps.sms4sats.sendPage.phoneNumberCountryDescription",
            )}
            textStyles={{ textAlign: "center", marginTop: 20 }}
          />
          <input
            type="text"
            className="sms4sats-phone-input"
            style={{ backgroundColor: backgroundOffset, color: textColor }}
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="United States"
          />

          {!isExactCountryMatch && (
            <div className="sms4sats-country-grid">
              {filteredCountries.map((item) => (
                <button
                  key={`${item.country}-${item.isoCode}`}
                  className="sms4sats-country-item"
                  onClick={() => setCountrySearch(item.country)}
                  style={{ background: "none", border: "none" }}
                >
                  <span
                    className="sms4sats-country-flag"
                    role="img"
                    aria-label={item.country}
                  >
                    {getFlagFromCode({ code: item.isoCode })}
                  </span>
                  <ThemeText
                    textContent={item.country}
                    textStyles={{
                      fontSize: "0.75rem",
                      textAlign: "center",
                      opacity: 0.8,
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {isExactCountryMatch && (
            <>
              <ThemeText
                textContent={t(
                  "apps.sms4sats.sendPage.messageInputDescription",
                )}
                textStyles={{ textAlign: "center", marginTop: 20 }}
              />
              <textarea
                className="sms4sats-message-input"
                style={{ backgroundColor: backgroundOffset, color: textColor }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(
                  "apps.sms4sats.sendPage.messageInputDescription",
                )}
                maxLength={135}
              />
              <CustomButton
                buttonStyles={{
                  width: "100%",
                  maxWidth: 340,
                  marginTop: "auto",
                  opacity: canSubmit ? 1 : 0.4,
                }}
                actionFunction={handleSubmit}
                textContent={t("apps.sms4sats.sendPage.sendBTN")}
              />
            </>
          )}
        </div>
      )}

      {showConfirm && (
        <ConfirmationSlideUp
          phoneNumber={phoneNumber}
          areaCodeNum={selectedAreaCode[0]?.cc}
          message={message}
          onClose={() => setShowConfirm(false)}
          setIsSending={setIsSending}
          setSendingMessage={setSendingMessage}
        />
      )}
    </div>
  );
}
