import { useNavigate } from "react-router-dom";
import "./login.css";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";

function Home() {
  const navigate = useNavigate();
  return (
    <div className="loginComponenet">
      <h1>Blitz</h1>

      <div className="buttonContainer">
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() => navigate("/disclaimer")}
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={"Make new wallet"}
        />
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() => navigate("/restore")}
          textContent={"Enter seed phrase"}
        />
      </div>
      <p>Your Wallet, your coins, 100% open-source</p>
    </div>
  );
}

export default Home;
