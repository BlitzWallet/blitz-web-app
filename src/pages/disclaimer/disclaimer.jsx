import BackArrow from "../../components/backArrow/backArrow";
import disclaimerKeys from "../../assets/disclaimerKeys.png";
import "./style.css";
import { useNavigate } from "react-router-dom";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";

function DisclaimerPage() {
  const navigate = useNavigate();
  return (
    <div className="disclaimerContainer">
      <BackArrow />
      <div className="disclaimerContentContainer">
        <h1>Self-custodial</h1>
        <p className="recoveryText">
          Blitz cannot access your funds or help recover them if lost. By
          continuing, you agree to Blitz Wallet's terms and conditions.
        </p>
        <div className="imgContainer">
          <img loading="lazy" src={disclaimerKeys} />
        </div>
        <p className="quoteText">
          "With great power comes great responsibility" - Uncle Ben
        </p>
        <CustomButton
          actionFunction={() => navigate("/createAccount")}
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={"Next"}
        />
        <a href="https://blitzwalletapp.com/pages/terms/">
          Terms and Conditions
        </a>
      </div>
    </div>
  );
}

export default DisclaimerPage;
