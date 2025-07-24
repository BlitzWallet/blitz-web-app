import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "./skeleton.css";
import useThemeColors from "../../hooks/useThemeColors";
// Takes on the styles of transction container since that is where it is used
const skeletonLightModeBase = "#D2D2D2";
const skeletonLightsOutBase = "#2A2A2A";

export default function SkeletonLoadingTx({ theme, darkModeType }) {
  const { backgroundColor, backgroundOffset } = useThemeColors();
  return (
    <div className="skeletonContianer">
      <div className="circle">
        <Skeleton
          style={{ height: "100%", width: "100%", lineHeight: "unset" }}
          baseColor={
            theme
              ? darkModeType
                ? skeletonLightsOutBase
                : backgroundOffset
              : skeletonLightModeBase
          }
          highlightColor={backgroundColor}
        />
      </div>
      <div className="textContainer">
        <p>
          {
            <Skeleton
              baseColor={
                theme
                  ? darkModeType
                    ? skeletonLightsOutBase
                    : backgroundOffset
                  : skeletonLightModeBase
              }
              highlightColor={backgroundColor}
              style={{ lineHeight: 0.9 }}
            />
          }
        </p>
        <p>
          {
            <Skeleton
              baseColor={
                theme
                  ? darkModeType
                    ? skeletonLightsOutBase
                    : backgroundOffset
                  : skeletonLightModeBase
              }
              highlightColor={backgroundColor}
              style={{ lineHeight: 0.9 }}
            />
          }
        </p>
      </div>
    </div>
  );
}
