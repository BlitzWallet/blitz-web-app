import { useNavigate } from "react-router-dom";
import BackArrow from "../backArrow/backArrow";
import ThemeText from "../themeText/themeText";
import "./style.css";
import ThemeImage from "../ThemeImage/themeImage";
import { settingsIcon } from "../../constants/icons";
export default function CustomSettingsNavbar({
  text = "",
  textClassName,
  showWhite,
  showSettings,
  settingLocation,
}) {
  const navigate = useNavigate();
  return (
    <div className="pageNavBar">
      <BackArrow showWhite={showWhite} />
      <ThemeText
        className={`pageHeaderText ${textClassName}`}
        textContent={text}
      />
      {showSettings && (
        <ThemeImage
          clickFunction={() => navigate(`./${settingLocation}`)}
          className="settingsIcon"
          icon={settingsIcon}
        />
      )}
    </div>
  );
}
