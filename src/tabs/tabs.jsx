import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import useThemeColors from "../hooks/useThemeColors";
import TabsIcon from "../components/tabsIcon/tabsIcon";
import { useThemeContext } from "../contexts/themeContext";

export default function BottomTabs({ setValue, value, Link }) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();

  return (
    <div
      style={{
        backgroundColor: backgroundColor,
      }}
      id="bottonTabsContainer"
    >
      <div
        className="border"
        style={{
          backgroundColor: backgroundOffset,
        }}
      />
      <div
        style={{ backgroundColor: backgroundColor }}
        className="itemContainer"
      >
        <BottomNavigation
          className="customBottomNavStyles"
          value={value}
          onChange={(event, newValue) => setValue(newValue)}
          showLabels
          style={{
            backgroundColor: backgroundColor,
          }}
        >
          <BottomNavigationAction
            disableRipple
            className="bottomTextElement"
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            label="Contacts"
            icon={
              <TabsIcon
                theme={theme}
                darkModeType={darkModeType}
                value={value}
                icon="contacts"
              />
            }
            component={Link}
            to="/contacts"
          />
          <BottomNavigationAction
            disableRipple
            className="bottomTextElement"
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            label="Home"
            icon={
              <TabsIcon
                theme={theme}
                darkModeType={darkModeType}
                value={value}
                icon="wallet"
              />
            }
            component={Link}
            to="/wallet"
          />
          <BottomNavigationAction
            disableRipple
            className="bottomTextElement"
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            label="Store"
            icon={
              <TabsIcon
                theme={theme}
                darkModeType={darkModeType}
                value={value}
                icon="store"
              />
            }
            component={Link}
            to="/store"
          />
        </BottomNavigation>
      </div>
    </div>
  );
}
