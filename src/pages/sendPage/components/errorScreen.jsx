import Lottie from "lottie-react";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SafeAreaComponent from "../../../components/safeAreaContainer";
import ThemeText from "../../../components/themeText/themeText";
import CustomButton from "../../../components/customButton/customButton";
import errorAnimationJSON from "../../../assets/errorTxAnimation.json";
import { applyErrorAnimationTheme } from "../../../functions/lottieViewColorTransformers";
import "./style.css";
import { useThemeContext } from "../../../contexts/themeContext";

export default function ErrorWithPayment({ reason }) {
  const navigate = useNavigate();
  const windowWidth = window.innerWidth;
  const animationRef = useRef(null);
  const { theme, darkModeType } = useThemeContext();

  const errorAnimation = useMemo(() => {
    const defaultTheme = applyErrorAnimationTheme(
      errorAnimationJSON,
      theme ? (darkModeType ? "lightsOut" : "dark") : "light"
    );
    return defaultTheme;
  }, []);

  useEffect(() => {
    console.log(animationRef.current);
    if (!animationRef.current) return;

    // Play the animation
    animationRef.current.play();
  }, []);

  return (
    <div className={"errorWithPaymentComponent"}>
      <Lottie
        className="errorAnimation"
        lottieRef={animationRef}
        animationData={errorAnimation}
        loop={false}
        autoplay={true}
      />
      <ThemeText className={"errorText"} textContent={"Error message"} />
      <div className="sendErrorContentContainer">
        <ThemeText
          styles={{ textAlign: "center" }}
          textContent={String(reason)}
        />
      </div>
      <CustomButton
        textContent={"Continue"}
        actionFunction={() => {
          navigate("/wallet");
        }}
      />
    </div>
  );
}
