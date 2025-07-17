import "./login.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { decrypt } from "../../functions/encription";
import { useAuth } from "../../contexts/authContext";
import Storage from "../../functions/localStorage";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";

function Login() {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, textInputBackground, textInputColor, textColor } =
    useThemeColors();
  const navigate = useNavigate();
  const { login, setMnemoinc, deleteWallet, logout } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const wantsToDeleteAccount = queryParams.get("confirmed");
  const [didUseEnter, setDidUseEnter] = useState(false);
  const textInputElement = document.getElementById("inialPass");

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
    if (!didUseEnter) return;
    handlePassEncription();
  }, [didUseEnter]);

  useEffect(() => {
    const handleKeypressEvent = (e) => {
      if (e.code.toLowerCase() !== "enter") return;
      setDidUseEnter(true);
    };
    if (!textInputElement) return;
    textInputElement.addEventListener("keypress", handleKeypressEvent);
    return removeEventListener("keypress", handleKeypressEvent);
  }, [textInputElement]);

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
      <div
        style={{
          backgroundColor: theme ? backgroundOffset : Colors.dark.text,
          borderColor: theme ? "#6d6d6d" : "gainsboro",
          boxShadow: `0 0 5px 0 ${theme ? "#6d6d6d" : "gainsboro"}`,
        }}
        className="inputContainer"
      >
        <ThemeText
          className={"containerDescription"}
          textContent={"Enter Your Wallet Password"}
        />
        <input
          type="text"
          name="username"
          autoComplete="username"
          style={{ display: "none" }}
          tabIndex={-1}
        />
        <ThemeText textContent={"Password"} />
        <input
          style={{
            backgroundColor: textInputBackground,
            color: textInputColor,
          }}
          onChange={(e) => setPassword(e.target.value)}
          className="initialPass"
          type="password"
          name="passward"
          id="inialPass"
          autoComplete="current-password"
        />

        <ThemeText
          clickFunction={() => {
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
          className="forgotPassword"
          textStyles={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
          textContent={" Forgot password?"}
        />

        <CustomButton
          actionFunction={handlePassEncription}
          buttonStyles={{
            backgroundColor: theme ? Colors.dark.text : Colors.light.blue,

            opacity: !password ? 0.5 : 1,
            width: "100%",
            maxWidth: "unset",
            minWidth: "unset",
          }}
          textStyles={{ color: theme ? Colors.light.text : Colors.dark.text }}
          textContent={"Unlock wallet"}
        />
      </div>
    </div>
  );
}

export default Login;
