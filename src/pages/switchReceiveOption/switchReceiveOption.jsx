// SlideUpPage.jsx
import BackArrow from "../../components/backArrow/backArrow";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import lightningIcon from "../../assets/lightningBoltDark.png";
import lightningIconLight from "../../assets/lightningBoltLight.png";
import bitcoinIcon from "../../assets/chainDark.png";
import bitcoinIconLight from "../../assets/chainLight.png";
import sparkIcon from "../../assets/SparkAsteriskBlack.png";
import sparkIconLight from "../../assets/SparkAsteriskWhite.png";
import "./style.css";

import { useEffect, useState } from "react";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";
import ThemeImage from "../../components/ThemeImage/themeImage";
import { useThemeContext } from "../../contexts/themeContext";

export default function SwitchReceiveOption() {
  const [selectedOption, setSelectedOption] = useState("");
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const { theme } = useThemeContext();
  const naigate = useNavigate();
  const location = useLocation();
  const props = location.state;

  const amount = props?.amount;
  const description = props?.description;

  useEffect(() => {
    if (!selectedOption) return;
    naigate(`/receive`, {
      state: {
        receiveOption: selectedOption,
        amount: Number(amount),
        description: description,
        navigateHome: true,
      },
      replace: true,
    });
  }, [selectedOption]);
  return (
    <div style={{ backgroundColor }} className="sliderContainer">
      <BackArrow />
      <div
        style={{ backgroundColor: backgroundOffset }}
        className="optionsContainer"
      >
        <div
          onClick={() => setSelectedOption("lightning")}
          className="option"
          style={{ backgroundColor }}
        >
          <img src={theme ? lightningIconLight : lightningIcon} alt="" />
          <ThemeText textContent={"Lightning | Best for small payments"} />
        </div>
        <div
          onClick={() => setSelectedOption("bitcoin")}
          className="option"
          style={{ backgroundColor }}
        >
          <img src={theme ? bitcoinIconLight : bitcoinIcon} alt="" />
          <ThemeText textContent={"Bitcoin | Best for large payments"} />
        </div>
        <div
          onClick={() => setSelectedOption("spark")}
          className="option"
          style={{ backgroundColor }}
        >
          <img src={theme ? sparkIconLight : sparkIcon} alt="" />
          <ThemeText textContent={"Spark"} />
        </div>
      </div>
    </div>
  );
}
