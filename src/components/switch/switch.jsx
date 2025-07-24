import React, { useState, useRef, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
// import { useGlobalContextProvider } from "../../../context-store/context";
// import GetThemeColors from "../../hooks/themeColors";
// import { useGlobalThemeContext } from "../../../context-store/theme";
// import { COLORS, SIZES } from "../../constants";

import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { Colors } from "../../constants/theme";
import "./switch.css";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";

const CustomToggleSwitch = ({
  page,
  toggleSwitchFunction,
  stateValue,
  containerStyles,
}) => {
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { theme, darkModeType } = useThemeContext();

  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const [textWidth, setTextWidth] = useState(0);

  const isOn =
    page === "cameraSlider"
      ? masterInfoObject.enabledSlidingCamera
      : page === "eCash"
      ? !!masterInfoObject.enabledEcash
      : page === "hideUnknownContacts"
      ? masterInfoObject.hideUnknownContacts
      : page === "useTrampoline"
      ? masterInfoObject.useTrampoline
      : false;

  const localIsOn = stateValue !== undefined ? stateValue : isOn;
  const [sliderText, setSliderText] = useState(localIsOn ? "ON" : "OFF");

  const textRef = useRef(null);

  // Animate toggle switch
  const springProps = useSpring({
    animatedValue: localIsOn ? 1 : 0,
    config: { duration: 300 },
    onRest: () => setSliderText(localIsOn ? "ON" : "OFF"),
  });

  // Calculate dynamic colors
  const circleColor = localIsOn
    ? darkModeType && theme
      ? Colors.lightsout.background
      : Colors.dark.text
    : Colors.dark.text;

  const switchColor = localIsOn
    ? darkModeType && theme
      ? Colors.dark.text
      : Colors.light.blue
    : page === "cameraSlider" ||
      page === "eCash" ||
      page === "bankSettings" ||
      page === "hideUnknownContacts" ||
      page === "useTrampoline" ||
      page === "LoginSecurityMode" ||
      page === "fastPay"
    ? backgroundColor
    : backgroundOffset;

  const toggleSwitch = () => {
    toggleMasterInfoObject({
      [page === "hideUnknownContacts"
        ? "hideUnknownContacts"
        : page === "cameraSlider"
        ? "enabledSlidingCamera"
        : page === "eCash"
        ? "enabledEcash"
        : "useTrampoline"]: !localIsOn,
    });
  };

  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.offsetWidth);
    }
  }, [sliderText]);

  return (
    <button
      id="switchButton"
      onClick={() => {
        if (toggleSwitchFunction) toggleSwitchFunction();
        else toggleSwitch();
      }}
      style={{
        ...containerStyles,
      }}
    >
      <animated.div
        className="backgroundColorContainer"
        style={{ backgroundColor: switchColor }}
      >
        <animated.div
          className="dotItem"
          style={{
            backgroundColor: circleColor,
            transform: springProps.animatedValue.to(
              (v) => `translateX(${v === 0 ? 5 : v * 41}px)`
            ),
          }}
        />
        <animated.span
          className="switchText"
          ref={textRef}
          style={{
            color: localIsOn
              ? darkModeType && theme
                ? Colors.lightsout.background
                : Colors.dark.text
              : textColor,
            transform: springProps.animatedValue.to(
              (v) =>
                `translate(${localIsOn ? 10 : 70 - textWidth - 10}px, -50%)`
            ),
          }}
        >
          {sliderText}
        </animated.span>
      </animated.div>
    </button>
  );
};

export default CustomToggleSwitch;
