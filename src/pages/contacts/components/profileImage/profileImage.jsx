import React, { useState } from "react";
import customUUID from "../../../../functions/customUUID";
import userIconBlue from "../../../../assets/user.png";
import userIconWhite from "../../../../assets/user_white.png";

export default function ContactProfileImage({
  resizeMode = "cover",
  uri,
  darkModeType,
  theme,
  updated,
}) {
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackIcon = darkModeType && theme ? userIconWhite : userIconBlue;
  const customURI = uri
    ? `${uri}?v=${updated ? new Date(updated).getTime() : customUUID()}`
    : null;

  const source = !loadError && uri && !isLoading ? customURI : fallbackIcon;
  const isProfile = !loadError && uri && !isLoading;

  return (
    <img
      src={source}
      alt="profile"
      style={
        isProfile
          ? { width: "100%", aspectRatio: 1 }
          : {
              width: "50%",
              height: "50%",
              filter: theme
                ? "brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(7500%) hue-rotate(137deg) brightness(113%) contrast(101%)"
                : "initial",
            }
      }
      onLoad={() => setIsLoading(false)}
      onError={() => setLoadError(true)}
    />
  );
}
