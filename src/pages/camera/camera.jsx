import { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";

import BackArrow from "../../components/backArrow/backArrow";
import getDataFromClipboard from "../../functions/getDataFromClipboard";

import "./style.css";
import { Colors } from "../../constants/theme";
import CustomButton from "../../components/customButton/customButton";
import flashLightNoFill from "../../assets/flashlightNoFillWhite.png";
import flashLightFill from "../../assets/flashlight.png";
import images from "../../assets/images.png";
import { useCameraPermission } from "../../hooks/useCameraPermission";
import ThemeText from "../../components/themeText/themeText";
import { useThemeContext } from "../../contexts/themeContext";

// QrScanner. = "/qr-scanner-worker.min.js"; // Adjust if you move the file

export default function Camera({ openOverlay }) {
  const { theme, darkModeType } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const didScan = useRef(false);
  const fileInput = document.getElementById("file-selector");
  const [pauseCamera, setPauseCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isFlashlightOn, setIsFlashLightOn] = useState(false);
  const cameraPermissions = useCameraPermission();
  console.log(cameraPermissions, "test");

  useEffect(() => {
    if (pauseCamera || didScan.current || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        console.log(result, "result in camera scan");
        const data = result.data;
        if (!data) return;
        if (didScan.current) return;
        didScan.current = true;

        scanner.stop();

        setPauseCamera(true);
        navigate("/send", { state: { btcAddress: data } });
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      }
    );

    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => setIsCameraReady(true))
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        setIsCameraReady(false);
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [navigate, pauseCamera]);

  const handlePaste = async () => {
    if (didScan.current) return;
    didScan.current = true;

    setPauseCamera(true);
    const data = await getDataFromClipboard();
    console.log("result from paste option", data);
    navigate("/send", { state: { btcAddress: data } });
  };
  const toggleFlashLight = async () => {
    try {
      const hasFlash = await scannerRef.current.hasFlash();
      if (!hasFlash) {
        openOverlay({
          for: "error",
          errorMessage: "Device does not have a flash.",
        });
        return;
      }
      await scannerRef.current.toggleFlash();
      const isFlashOn = scannerRef.current.isFlashOn();
      setIsFlashLightOn(isFlashOn);
    } catch (err) {
      console.log("camera flash error", err);
    }
  };

  const fileListener = () => {
    const file = fileInput.files[0];

    if (!file) {
      return;
    }
    QrScanner.scanImage(file, { returnDetailedScanResult: true })
      .then((result) => {
        console.log(result, "result from file listener");
        const data = result.data;
        if (!data) return;
        if (didScan.current) return;
        didScan.current = true;
        navigate("/send", { state: { btcAddress: data } });

        fileInput.removeEventListener("change", fileListener);
      })
      .catch((e) => {
        openOverlay({
          for: "error",
          errorMessage: "No QR code found.",
        });

        fileInput.removeEventListener("change", fileListener);
      });
  };
  const getDataFromFile = async () => {
    try {
      fileInput.addEventListener("change", fileListener);
      fileInput.click();
    } catch (err) {
      console.log("camera flash error", err);
    }
  };

  return (
    <div className="camera-page">
      <div className="backContainer">
        <BackArrow showWhite={true} />
      </div>
      <div id="video-container" className="example-style-2">
        <video
          ref={videoRef}
          className="camera-video"
          disablePictureInPicture
          playsInline
          muted
          style={{ width: "100%" }}
        />
        <div
          className="scan-region-highlight"
          style={{
            border: `4px solid ${
              theme && darkModeType ? Colors.dark.text : Colors.light.blue
            }`,
          }}
        >
          {!isCameraReady && (
            <ThemeText
              textContent={
                cameraPermissions === "denied"
                  ? "To use this feature, enable camera in the browser settings."
                  : "Loading camera..."
              }
            />
          )}
        </div>
      </div>
      <div onClick={getDataFromFile} className="fileContainer">
        <input hidden type="file" id="file-selector" accept="image/*" />
        <img className="optionImage" src={images} alt="images icon" />
      </div>
      <div onClick={toggleFlashLight} className="flashLightContainer">
        <img
          className="optionImage"
          src={isFlashlightOn ? flashLightFill : flashLightNoFill}
          alt="flash light icon"
        />
      </div>
      <CustomButton
        actionFunction={handlePaste}
        textContent={"Paste"}
        buttonClassName={"handleCameraPaste"}
        textClassName={"handleCameraPasteText"}
      />
    </div>
  );
}
