import { useSpark } from "../../../../contexts/sparkContext";
import clipbardIcon from "../../../../assets/clipboardIcon.png";
import clipbardIconLight from "../../../../assets/clipboardLight.png";
import copyToClipboard from "../../../../functions/copyToClipboard";
import "./sparkInfo.css";
import { useLocation, useNavigate } from "react-router-dom";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Colors } from "../../../../constants/theme";
import ThemeText from "../../../../components/themeText/themeText";
import ThemeImage from "../../../../components/ThemeImage/themeImage";

export default function SparkInformation({ openOverlay }) {
  const { sparkInformation } = useSpark();
  const navigate = useNavigate();
  const location = useLocation();
  const { backgroundOffset } = useThemeColors();
  const { theme } = useThemeContext();
  return (
    <div id="sparkInfoContainer">
      <div className="contentContainer">
        <div
          style={{
            backgroundColor: theme ? backgroundOffset : Colors.dark.text,
          }}
          className="techincalContainer"
        >
          <div className="technicalRow">
            <ThemeText
              className="techicalLabel"
              textContent={"Spark address"}
            />
            <span
              onClick={() =>
                copyToClipboard(
                  sparkInformation.sparkAddress,
                  openOverlay,
                  location
                )
              }
              className="techicalData"
            >
              <ThemeText
                className="techicalLabel"
                textContent={`${sparkInformation.sparkAddress.slice(0, 5)}...
                ${sparkInformation.sparkAddress.slice(
                  sparkInformation.sparkAddress.length - 5
                )}`}
              />
              <ThemeImage
                styles={{ width: 20, height: 20 }}
                lightModeIcon={clipbardIcon}
                darkModeIcon={clipbardIcon}
                lightsOutIcon={clipbardIconLight}
              />
            </span>
          </div>
          <div className="technicalRow">
            <ThemeText className="techicalLabel" textContent={"Public key"} />
            <span
              onClick={() =>
                copyToClipboard(
                  sparkInformation.identityPubKey,
                  openOverlay,
                  location
                )
              }
              className="techicalData"
            >
              <ThemeText
                className="techicalLabel"
                textContent={`${sparkInformation.identityPubKey.slice(0, 5)}...
                ${sparkInformation.identityPubKey.slice(
                  sparkInformation.identityPubKey.length - 5
                )}`}
              />
              <ThemeImage
                styles={{ width: 20, height: 20 }}
                lightModeIcon={clipbardIcon}
                darkModeIcon={clipbardIcon}
                lightsOutIcon={clipbardIconLight}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
