import "./login.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { decrypt } from "../../functions/encription";
import { useAuth } from "../../contexts/authContext";
import Storage from "../../functions/localStorage";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";

function Login() {
  const navigate = useNavigate();
  const { login, setMnemoinc, deleteWallet, logout } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const wantsToDeleteAccount = queryParams.get("confirmed");

  const [password, setPassword] = useState("");

  const handlePassEncription = () => {
    if (!password) return;

    const storedKey = Storage.getItem("walletKey");

    const decryted = decrypt(storedKey, password);
    if (!decryted) {
      navigate("/error", {
        state: { errorMessage: "Incorrect password", background: location },
      });
      return;
    }
    setMnemoinc(decryted);
    login(storedKey);
  };

  useEffect(() => {
    if (!wantsToDeleteAccount) return;
    if (wantsToDeleteAccount !== "true") return;

    async function deleateAllWalletData() {
      try {
        deleteWallet();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err) {
        console.log("Error deleting account", err);
        navigate("/error", {
          state: {
            errorMessage: "Error deleting account",
            background: location,
          },
        });
      }
    }
    deleateAllWalletData();
  }, [wantsToDeleteAccount]);
  return (
    <div className="passwordContainer">
      <div className="inputContainer">
        <p className="containerDescription">Enter Your Wallet Password</p>
        <input
          type="text"
          name="username"
          autoComplete="username"
          style={{ display: "none" }}
          tabIndex={-1}
        />
        <p>Password</p>
        <input
          onChange={(e) => setPassword(e.target.value)}
          className="initialPass"
          type="password"
          name="passward"
          id="inialPass"
          autoComplete="current-password"
        />

        <p
          onClick={() => {
            navigate("/confirm-action", {
              state: {
                confirmHeader: "Are you sure you want to reset your wallet?",
                confirmDescription:
                  "If you forget your password, your wallet key will be permanently deleted from this device. Without your key, your Bitcoin will be lost forever.",
                fromRoute: "login",
                background: location,
              },
            });
          }}
          style={{ color: Colors.light.blue }}
          className="forgotPassword"
        >
          Forgot password?
        </p>

        <CustomButton
          actionFunction={handlePassEncription}
          buttonStyles={{
            backgroundColor: Colors.light.blue,
            opacity: !password ? 0.5 : 1,
            width: "100%",
            maxWidth: "unset",
            minWidth: "unset",
          }}
          textStyles={{ color: Colors.dark.text }}
          textContent={"Unlock wallet"}
        />
      </div>
    </div>
  );
}

export default Login;
