import { useNavigate } from "react-router-dom";
import backArrowIcon from "../../assets/arrow-left-blue.png";
import backArrowWhiteIcon from "../../assets/arrow-small-left-white.png";
import "./style.css";
import ThemeImage from "../ThemeImage/themeImage";

export default function BackArrow({ backFunction, showWhite = false }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => {
        if (backFunction) {
          backFunction();
          return;
        }
        navigate(-1);
      }}
      className="backArrowContainer"
    >
      <ThemeImage
        lightModeIcon={backArrowIcon}
        darkModeIcon={backArrowIcon}
        lightsOutIcon={backArrowWhiteIcon}
      />
    </div>
  );
}
