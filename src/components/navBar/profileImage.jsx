import { useNavigate } from "react-router-dom";
import useThemeColors from "../../hooks/useThemeColors";

import { useImageCache } from "../../contexts/imageCacheContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useThemeContext } from "../../contexts/themeContext";
import ContactProfileImage from "../../pages/contacts/components/profileImage/profileImage";
import "./profileImage.css";

export default function NavBarProfileImage() {
  const { backgroundOffset } = useThemeColors();
  const { cache } = useImageCache();
  const { masterInfoObject } = useGlobalContextProvider();
  const { theme, darkModeType } = useThemeContext();
  const navigate = useNavigate();
  return (
    <div
      style={{ backgroundColor: backgroundOffset }}
      className="navbarProfileImageContainer"
      onClick={() => {
        navigate("/settings");
      }}
    >
      <ContactProfileImage
        updated={cache[masterInfoObject?.uuid]?.updated}
        uri={cache[masterInfoObject?.uuid]?.localUri}
        theme={theme}
        darkModeType={darkModeType}
      />
    </div>
  );
}
