import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import useThemeColors from "../hooks/useThemeColors";
import TabsIcon from "../components/tabsIcon/tabsIcon";

export default function BottomTabs({ setValue, value, Link }) {
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
            icon={<TabsIcon value={value} icon="contacts" />}
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
            icon={<TabsIcon value={value} icon="wallet" />}
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
            icon={<TabsIcon value={value} icon="store" />}
            component={Link}
            to="/store"
          />
        </BottomNavigation>
      </div>
    </div>
  );
}
