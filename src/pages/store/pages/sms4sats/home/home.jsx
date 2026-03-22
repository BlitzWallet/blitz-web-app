import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackArrow from "../../../../../components/backArrow/backArrow";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import "../style.css";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";

export default function SMS4SatsHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [smsServices, setSmsServices] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          "https://api2.sms4sats.com/getnumbersstatus?country=999",
          { method: "GET" },
        );
        const data = await response.json();
        setSmsServices(data);
      } catch (err) {
        console.log("SMS4Sats fetch error:", err);
      }
    })();
  }, []);

  return (
    <div className="sms4sats-page">
      <CustomSettingsNavBar />

      <div className="sms4sats-home-content">
        <ThemeText
          textContent={t("apps.sms4sats.home.pageDescription")}
          textStyles={{
            textAlign: "center",
            fontSize: "1.1rem",
            marginBottom: 40,
          }}
        />
        <CustomButton
          buttonStyles={{ width: "80%", marginBottom: 30 }}
          actionFunction={() =>
            navigate("/store-item", { state: { for: "sms4sats-send" } })
          }
          textContent={t("constants.send")}
        />
        <CustomButton
          buttonStyles={{ width: "80%" }}
          actionFunction={() =>
            navigate("/store-item", {
              state: { for: "sms4sats-receive", smsServices },
            })
          }
          textContent={t("constants.receive")}
        />
      </div>
    </div>
  );
}
