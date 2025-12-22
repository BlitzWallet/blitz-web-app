import ThemeText from "../themeText/themeText";
import BackArrow from "../backArrow/backArrow";
import { useThemeContext } from "../../contexts/themeContext";
import { Colors } from "../../constants/theme";
import { useNavigate } from "react-router-dom";
import "./style.css";
// Custom Settings Top Bar Component
export default function CustomSettingsNavBar({
  containerStyles = {},
  textStyles = {},
  text = "",
  showLeftImage = false,
  leftImageFunction = () => {},
  LeftImageIcon = null,
  leftImageStyles = {},
  textClassName,
  customBackFunction = null,
  showWhite = false,
}) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (customBackFunction) {
      customBackFunction();
      return;
    }
    navigate(-1);
  };
  const { theme, darkModeType } = useThemeContext();

  return (
    <div className="pageNavBar" style={containerStyles}>
      <BackArrow backFunction={handleBackClick} showWhite={showWhite} />

      <ThemeText
        className={`pageHeaderText ${textClassName}`}
        textStyles={{ ...textStyles }}
        textContent={text}
      />
      {showLeftImage && (
        <LeftImageIcon
          className="right-action"
          onClick={leftImageFunction}
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      )}
    </div>
  );
}
