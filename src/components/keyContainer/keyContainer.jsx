import React from "react";
import "./style.css";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../themeText/themeText";

export function KeyContainer(props) {
  const { backgroundOffset, textColor } = useThemeColors();
  let tempArr = [];

  const styles = {
    numberText: {
      marginRight: 10,
    },
    textInputStyle: {
      width: "90%",
      border: "none",
      background: "transparent",
      outline: "none",
      marginLeft: "5px",
    },
  };
  props.keys.forEach((element, id) => {
    tempArr.push(
      <div
        style={{ backgroundColor: backgroundOffset }}
        key={element}
        className="seedPill"
      >
        <ThemeText
          textStyles={{ margin: 0 }}
          className={"seedText"}
          textContent={`${id + 1}.`}
        />
        <input
          className="seedText"
          readOnly
          value={element}
          style={{
            ...styles.textInputStyle,
            color: textColor,
          }}
        />
      </div>
    );
  });

  return <div className="keyContainer">{tempArr}</div>;
}
