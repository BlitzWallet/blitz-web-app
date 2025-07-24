import { useNavigate } from "react-router-dom";
import arrow from "../../../../assets/arrow-left-blue.png";
import arrowWhite from "../../../../assets/arrow-small-left-white.png";
import sendRequestImage from "../../../../assets/sendRequestImage.png";
import Qr from "../../../../assets/scanQRCodeLight.png";
import "./style.css";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
export default function SendAndRequestBtns() {
  const { theme } = useThemeContext();
  const naigate = useNavigate();
  return (
    <div className="sendAndRequstContainer">
      <div
        onClick={() => naigate("/camera")}
        className="buttonContainer buttonWhite"
      >
        <div
          style={{ backgroundColor: theme ? "transparent" : Colors.light.blue }}
          className="fill"
        />
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          lightModeIcon={sendRequestImage}
          darkModeIcon={sendRequestImage}
          lightsOutIcon={sendRequestImage}
          className="send"
        />
      </div>

      {/* <div
        onClick={() => naigate("/camera")}
        className="buttonContainer buttonBlue"
      >
        <img className="buttonImage" src={Qr} alt="small arrow" />
      </div> */}
      <div onClick={() => naigate("/receive")} className="buttonContainer">
        <div
          style={{ backgroundColor: theme ? "transparent" : Colors.light.blue }}
          className="fill"
        />
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          lightModeIcon={sendRequestImage}
          darkModeIcon={sendRequestImage}
          lightsOutIcon={sendRequestImage}
          className="request"
        />
        {/* <img className="buttonImage request" src={arrow} alt="small arrow" /> */}
      </div>
    </div>
  );
}
