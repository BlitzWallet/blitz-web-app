import { Colors } from "../../constants/theme";
import "./style.css";
export default function ActivityIndicator({ color, size = "small" }) {
  console.log(color);
  return (
    <div
      style={{
        width: size === "small" ? "20px" : "40px",
        height: size === "small" ? "20px" : "40px",
        borderBottom: `4px solid ${Colors.light.backgroundOffset}`,
        borderLeft: `4px solid ${Colors.light.backgroundOffset}`,
        borderRight: `4px solid ${Colors.light.backgroundOffset}`,
        borderTop: `4px solid ${color}`,
      }}
      id="activityIndicator"
    ></div>
  );
}
