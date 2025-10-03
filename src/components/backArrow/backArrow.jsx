import { useNavigate } from "react-router-dom";
import "./style.css";
import ThemeImage from "../ThemeImage/themeImage";
import { arrow_small_left_white, smallArrowLeft } from "../../constants/icons";

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
        lightModeIcon={showWhite ? arrow_small_left_white : smallArrowLeft}
        darkModeIcon={showWhite ? arrow_small_left_white : smallArrowLeft}
        lightsOutIcon={
          showWhite ? arrow_small_left_white : arrow_small_left_white
        }
      />
    </div>
  );
}
