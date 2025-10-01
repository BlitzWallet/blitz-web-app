import { useNavigate } from "react-router-dom";
import "./login.css";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useTranslation } from "react-i18next";

function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="loginComponenet">
      <h1>Blitz</h1>
      <div className="buttonContainer">
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() =>
            navigate("/disclaimer", {
              state: {
                nextPageName: "/createAccount",
              },
            })
          }
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={t("createAccount.homePage.buttons.button2")}
        />
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() =>
            navigate("/disclaimer", {
              state: {
                nextPageName: "/restore",
              },
            })
          }
          textContent={t("createAccount.homePage.buttons.button1")}
        />
      </div>
      <p>{t("createAccount.homePage.subtitle")}</p>
    </div>
  );
}

export default Home;
