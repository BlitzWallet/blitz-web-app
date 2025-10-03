import { useNavigate } from "react-router-dom";
import sendRequestImage from "../../../../assets/sendRequestImage.png";
import Qr from "../../../../assets/scanQRCodeLight.png";
import "./style.css";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function SendAndRequestBtns({ openOverlay }) {
  const { theme } = useThemeContext();
  const naigate = useNavigate();
  const { backgroundOffset } = useThemeColors();
  return (
    <div className="sendAndRequstContainer">
      <div
        onClick={() =>
          openOverlay({
            for: "halfModal",
            contentType: "HalfModalSendOptions",
            params: {},
          })
        }
        className="buttonContainer buttonWhite"
      >
        <div
          style={{ backgroundColor: theme ? "transparent" : Colors.light.blue }}
          className="fill"
        />
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          icon={sendRequestImage}
          className="send"
        />
      </div>

      <div
        style={{
          backgroundColor: theme ? backgroundOffset : Colors.light.blue,
        }}
        onClick={() => naigate("/camera")}
        className="buttonContainer"
      >
        <ThemeImage
          styles={{ width: "60%", height: "60%" }}
          icon={Qr}
          className="request"
        />
      </div>

      <div onClick={() => naigate("/receive")} className="buttonContainer">
        <div
          style={{ backgroundColor: theme ? "transparent" : Colors.light.blue }}
          className="fill"
        />
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          icon={sendRequestImage}
          className="request"
        />
      </div>
    </div>
  );
}
