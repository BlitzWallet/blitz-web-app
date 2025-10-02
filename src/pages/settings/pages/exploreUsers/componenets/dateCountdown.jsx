import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ThemeText from "../../../../../components/themeText/themeText";

export default function DateCountdown({ getServerTime }) {
  const [minuteTick, setMinuteTick] = useState();
  const intervalRef = useRef(null);

  useEffect(() => {
    setMinuteTick(getFommattedTime(getServerTime));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setMinuteTick(getFommattedTime(getServerTime));
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

function getFommattedTime(getServerTime) {
  const date = new Date(getServerTime());

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
