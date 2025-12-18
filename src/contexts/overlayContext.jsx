import { createContext, useCallback, useContext, useState } from "react";

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [overlays, setOverlays] = useState([]);

  const openOverlay = useCallback((overlay) => {
    setOverlays((prev) => {
      if (overlay.for === "halfModal") {
        return prev.slice(0, -1).concat(overlay);
      }
      return [...prev, overlay];
    });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlays((prev) => prev.slice(0, -1));
  }, []);

  const clearOverlays = useCallback(() => {
    setOverlays([]);
  }, []);

  return (
    <OverlayContext.Provider
      value={{
        overlays,
        openOverlay,
        closeOverlay,
        clearOverlays,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error("useOverlay must be used inside OverlayProvider");
  }
  return ctx;
}
