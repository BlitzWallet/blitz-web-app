import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Storage from "../functions/localStorage";
import { THEME_DARK_MODE_KEY, THEME_LOCAL_STORAGE_KEY } from "../constants";
import { Colors } from "../constants/theme";

export const ThemeContext = createContext({});

export function ThemeContextProvider({ children }) {
  const [theme, setTheme] = useState(null);
  const [darkModeType, setDarkModeType] = useState(null);

  const toggleDarkModeType = useCallback((param) => {
    const mode = param ? "dim" : "lights-out";
    Storage.setItem(THEME_DARK_MODE_KEY, mode);
    setDarkModeType(param);
  }, []);

  const toggleTheme = useCallback(async (param) => {
    const mode = param ? "light" : "dark";
    Storage.setItem(THEME_LOCAL_STORAGE_KEY, mode);
    setTheme(param);
  }, []);

  useEffect(() => {
    function loadTheme() {
      const savedTheme = Storage.getItem(THEME_LOCAL_STORAGE_KEY);
      const savedDarkMode = Storage.getItem(THEME_DARK_MODE_KEY);

      const darkModeType =
        savedDarkMode === null ? true : savedDarkMode === "dim";
      const theme = savedTheme === null ? false : savedTheme !== "dark";
      setTheme(theme);
      setDarkModeType(darkModeType);
    }
    loadTheme();
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = theme
      ? darkModeType
        ? Colors.lightsout.background
        : Colors.dark.background
      : Colors.light.background;
  }, [theme, darkModeType]);

  const contextValues = useMemo(() => {
    return { theme, toggleTheme, darkModeType, toggleDarkModeType };
  }, [theme, toggleTheme, darkModeType, toggleDarkModeType]);

  return (
    <ThemeContext.Provider value={contextValues}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const themeContext = useContext(ThemeContext);
  if (!themeContext)
    throw new Error("ThemeContext must be used within a ThemeContextProvider");

  return themeContext;
}
