import { useNavigate } from "react-router-dom";
import sendRequestImage from "../../../../assets/sendRequestImage.png";
import Qr from "../../../../assets/scanQRCodeLight.png";
import "./style.css";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { ArrowDown, ArrowUp, ScanLine } from "lucide-react";

export default function SendAndRequestBtns({ openOverlay }) {
  const { theme, darkModeType } = useThemeContext();
  const naigate = useNavigate();
  const { backgroundOffset, backgroundColor } = useThemeColors();

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
        style={{ backgroundColor: Colors.dark.text }}
      >
        {/* <div
          style={{ backgroundColor: theme ? "transparent" : Colors.light.blue }}
          className="fill"
        /> */}
        <ArrowUp
          color={
            theme && darkModeType ? backgroundColor : Colors.constants.blue
          }
          size={25}
        />
        {/* <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          icon={sendRequestImage}
          className="send"
        /> */}
      </div>

      <div
        style={{
          width: 80,
          height: 80,
          backgroundColor:
            theme && darkModeType ? backgroundOffset : Colors.light.blue,
        }}
        onClick={() => naigate("/camera")}
        className="buttonContainer"
      >
        <ScanLine color={Colors.dark.text} size={30} />
      </div>

      <div
        onClick={() => naigate("/receive")}
        className="buttonContainer"
        style={{ backgroundColor: Colors.dark.text }}
      >
        <ArrowDown
          color={
            theme && darkModeType ? backgroundColor : Colors.constants.blue
          }
          size={25}
        />
      </div>
    </div>
  );
}
