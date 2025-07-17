import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import { Colors } from "../../constants/theme";
import "./slider.css";

const marks = [
  {
    value: 15,
    label: "15",
  },
  {
    value: 20,
    label: "20",
  },
  {
    value: 25,
    label: "25",
  },
  {
    value: 30,
    label: "30",
  },
  {
    value: 35,
    label: "35",
  },
  {
    value: 40,
    label: "40",
  },
];

function valuetext(value) {
  return `${value}`;
}

export default function DiscreteSlider({
  boxWidth = 300,
  sliderLabel = "Custom marks",
  defaultValue = 0,
  shiftStep = 30,
  step = 10,
  min = 0,
  max = 9999,
  toggleFunction,
  theme,
  darkModeType,
}) {
  const currentValueRef = React.useRef(null);
  return (
    <Box sx={{ width: "90%", margin: "0 auto" }}>
      <Slider
        aria-label={sliderLabel}
        defaultValue={defaultValue}
        getAriaValueText={valuetext}
        onChange={(event) => (currentValueRef.current = event.target.value)}
        onChangeCommitted={() => toggleFunction(currentValueRef.current)}
        valueLabelDisplay="off"
        shiftStep={shiftStep}
        step={step}
        marks={marks}
        min={min}
        max={max}
        className="discreteSlider"
        sx={{
          height: 10,
          color: theme ? "black" : Colors.dark.text,
          backgroundColor: theme ? "black" : Colors.dark.text,
          padding: 0,
        }}
      />
    </Box>
  );
}
