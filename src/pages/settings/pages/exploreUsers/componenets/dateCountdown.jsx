import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ThemeText from "../../../../../components/themeText/themeText";

export default function DateCountdown() {
  const [minuteTick, setMinuteTick] = useState();
  const intervalRef = useRef(null);

  useEffect(() => {
    setMinuteTick(getFommattedTime());

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setMinuteTick(getFommattedTime());
    }, 1000);

    return () => {
      console.log("Clearing stable time interval");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return <ThemeText textContent={`(${minuteTick} left)`} />;
}

function getFommattedTime() {
  const timestamp = new Date().getTime();
  const date = new Date(timestamp);

  // Get midnight of the same day
  const midnight = new Date(date);
  midnight.setUTCHours(24, 0, 0, 0); // Set to midnight (start of next day)

  // Calculate time difference in milliseconds
  const diffMs = midnight - date;

  // Convert to hours, minutes, and seconds
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}
