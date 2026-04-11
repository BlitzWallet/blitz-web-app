import "./CircularProgress.css";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function CircularProgress({
  current,
  goal,
  size = 35,
  strokeWidth = 3,
  showConfirmed,
}) {
  const { backgroundOffset } = useThemeColors();
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const trackColor = backgroundOffset;
  const progressColor = showConfirmed ? "#34C759" : "#0375F6";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="circular-progress"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}
