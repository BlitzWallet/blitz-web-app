import { useNavigate } from "react-router-dom";
import "./style.css";
import { ArrowLeft } from "lucide-react";
import useThemeColors from "../../hooks/useThemeColors";
import { Colors } from "../../constants/theme";

export default function BackArrow({ backFunction, showWhite = false }) {
  const { theme, darkModeType } = useThemeColors();
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
      <ArrowLeft
        color={
          showWhite
            ? Colors.dark.text
            : theme && darkModeType
            ? Colors.dark.text
            : Colors.constants.blue
        }
        size={30}
      />
    </div>
  );
}
