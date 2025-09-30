import { useEffect, useState } from "react";
import BackArrow from "../../components/backArrow/backArrow";
import { KeyContainer } from "../../components/keyContainer/keyContainer";
import { useAuth } from "../../contexts/authContext";
import "./viewKey.css";
import { useLocation, useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import calculateSeedQR from "../../functions/calculateSeedQR";
import QRCodeQrapper from "../../components/qrCode/qrCode";
import CustomButton from "../../components/customButton/customButton";
import copyToClipboard from "../../functions/copyToClipboard";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";
import { useThemeContext } from "../../contexts/themeContext";

export default function ViewMnemoinc({ openOverlay }) {
  const navigate = useNavigate();
  const location = useLocation();
  const props = location.state;
  const { mnemoinc } = useAuth();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const [shouldShowMnemoinc, setShouldShowMnemoinc] = useState(
    !!props?.confirmed
  );
  const [showSeedAsWords, setShowSeedAsWords] = useState(true);
  const seedQRCalculation = calculateSeedQR(mnemoinc);

  useEffect(() => {
    if (props.confirmed === undefined) return;
    if (props.confirmed) {
      setShowSeedAsWords(false);
    }
    console.log(props.confirmed, "is confimred");
  }, [props.confirmed]);

  const toggleSeedAsWords = () => {
    if (showSeedAsWords && !props?.confirmed) {
      openOverlay({
        for: "confirm-action",
        confirmHeader: "Are you sure you want to show this QR Code?",
        confirmDescription:
          "Scanning your seed is convenient, but be sure you're using a secure and trusted device. This helps keep your wallet safe.",
        useCustomProps: true,
        customProps: {
          confirmed: true,
          for: "backup wallet",
        },
        useProps: true,
        navigateBack: "settings-item",
        fromRoute: "settings-item",
      });
      return;
    }
    setShowSeedAsWords((prev) => !prev);
  };
  return (
    <div className="viewMnemoincContainer">
      <div
        style={{ top: shouldShowMnemoinc ? "200%" : 0, backgroundColor }}
        className="mnemoincCover"
      >
        <div className="coverContent">
          <ThemeText
            className={"viewMnemoincText"}
            textContent={"Are you sure you want to show your recover phrase?"}
          />
          <div className="buttonContianer">
            <CustomButton
              actionFunction={() => setShouldShowMnemoinc(true)}
              buttonStyles={{
                backgroundColor:
                  theme && darkModeType ? backgroundOffset : Colors.light.blue,
              }}
              textStyles={{
                color:
                  theme && darkModeType ? Colors.dark.text : Colors.dark.text,
              }}
              textContent={"Yes"}
            />
            <CustomButton
              actionFunction={() => navigate(-1)}
              textContent={"No"}
            />
          </div>
        </div>
      </div>
      <ThemeText
        className={"warning1"}
        textContent={"Keep this phrase in a secure and safe place"}
      />
      <ThemeText
        textStyles={{
          color: theme && darkModeType ? textColor : Colors.constants.cancelRed,
        }}
        className={"warning2"}
        textContent={"Don’t share or screenshot this phrase!"}
      />
      <div className="mnemoincContainer">
        {showSeedAsWords ? (
          <KeyContainer keys={mnemoinc.split(" ")} />
        ) : (
          <div className="qrCodeWraperContainer" style={{ height: "362px" }}>
            <QRCodeQrapper data={seedQRCalculation} />
          </div>
        )}
      </div>

      <div
        onClick={toggleSeedAsWords}
        style={{ backgroundColor: backgroundOffset }}
        className="switchContainer"
      >
        <div
          style={{
            backgroundColor: backgroundColor,
            left: showSeedAsWords ? "3px" : "100px",
          }}
          className="optionSlider"
        />
        <ThemeText textContent={"Words"} />
        <ThemeText textContent={"QR Code"} />
      </div>
      <CustomButton
        actionFunction={() => {
          console.log(openOverlay);
          copyToClipboard(
            showSeedAsWords ? mnemoinc : seedQRCalculation,
            openOverlay
          );
        }}
        buttonClassName={"copySeedBTNContainer"}
        textContent={"Copy"}
      />
    </div>
  );
}
