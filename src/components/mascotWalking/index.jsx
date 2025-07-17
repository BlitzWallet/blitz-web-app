import Lottie from "lottie-react";
import mascotAnimation from "../../assets/MOSCATWALKING.json";
import { useThemeContext } from "../../contexts/themeContext";
import { useMemo } from "react";
import { updateMascatWalkingAnimation } from "../../functions/lottieViewColorTransformers";

export default function MascotWalking() {
  const { theme } = useThemeContext();
  const transformedAnimation = useMemo(() => {
    return updateMascatWalkingAnimation(
      mascotAnimation,
      theme ? "white" : "blue"
    );
  }, [theme]);
  return (
    <Lottie
      style={{ flex: 1 }}
      animationData={transformedAnimation}
      loop={true}
    />
  );
}
