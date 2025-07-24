import { QRCodeSVG } from "qrcode.react";
import logo from "../../assets/qrImage.png";
import "./style.css";
import useThemeColors from "../../hooks/useThemeColors";
import { Colors } from "../../constants/theme";
export default function QRCodeQrapper({ data }) {
  return (
    <div style={{ backgroundColor: Colors.dark.text }} className="qrContainer">
      <div className="imageContainer">
        <img src={logo} />
      </div>
      <QRCodeSVG
        height={"100%"}
        width={"100%"}
        color={Colors.light.text}
        bgColor={Colors.dark.text}
        value={data}
      />
    </div>
  );
}
