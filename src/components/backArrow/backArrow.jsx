import { useNavigate } from "react-router-dom";
import "./style.css";
import ThemeImage from "../ThemeImage/themeImage";
import { smallArrowLeft } from "../../constants/icons";
import { WHITE_FILTER } from "../../constants";

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
        icon={smallArrowLeft}
        filter={showWhite ? WHITE_FILTER : undefined}
      />
    </div>
  );
}
