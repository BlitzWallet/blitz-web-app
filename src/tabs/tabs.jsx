import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import { Home, Users, Store } from "lucide-react";
import { useMemo, useState } from "react";
import useThemeColors from "../hooks/useThemeColors";
import { useThemeContext } from "../contexts/themeContext";

const TabsIcon = ({ value, icon, activeColor, iconValue }) => {
  const iconMap = {
    contacts: Users,
    wallet: Home,
    store: Store,
  };

  const Icon = iconMap[icon];
  return (
    <Icon color={value === iconValue ? activeColor : "var(--lmt)"} size={24} />
  );
};

export default function BottomTabs({ setValue, value, Link }) {
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();

  const activeColor = useMemo(() => {
    return theme ? "var(--dmt)" : "var(--primaryBlue)";
  }, [theme, darkModeType]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 40px)",
        maxWidth: "400px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--dmt)",
          borderRadius: "24px",
          padding: "8px",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <BottomNavigation
          value={value}
          onChange={(event, newValue) => setValue(newValue)}
          showLabels
          style={{
            backgroundColor: "transparent",
            borderRadius: "20px",
          }}
          sx={{
            "& .MuiBottomNavigationAction-root": {
              minWidth: "auto",
              padding: "5px 12px",
              borderRadius: "16px",
              transition: "all 0.3s ease",
            },
            "& .Mui-selected": {
              backgroundColor: backgroundOffset,
            },
          }}
        >
          <BottomNavigationAction
            disableRipple
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            icon={
              <TabsIcon
                activeColor={activeColor}
                value={value}
                iconValue={0}
                icon="contacts"
              />
            }
            component={Link}
            to="/contacts"
          />
          <BottomNavigationAction
            disableRipple
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            icon={
              <TabsIcon
                activeColor={activeColor}
                value={value}
                iconValue={1}
                icon="wallet"
              />
            }
            component={Link}
            to="/wallet"
          />
          <BottomNavigationAction
            disableRipple
            sx={{
              "& .MuiBottomNavigationAction-label": {
                color: textColor,
              },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                color: textColor,
              },
            }}
            icon={
              <TabsIcon
                activeColor={activeColor}
                value={value}
                iconValue={2}
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
