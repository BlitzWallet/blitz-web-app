import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const NavigationStackContext = createContext();

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType(); // "PUSH", "POP", "REPLACE"
  const [stack, setStack] = useState([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setStack([location.pathname]);
      return;
    }
    console.log(navigationType, location);

    setStack((prev) => {
      const newStack = [...prev];

      if (navigationType === "PUSH") {
        newStack.push(location.pathname);
      } else if (navigationType === "POP") {
        // You can choose to pop or just log back
        newStack.pop();
      } else if (navigationType === "REPLACE") {
        newStack[newStack.length - 1] = location.pathname;
      }

      return newStack;
    });
  }, [location, navigationType]);

  return (
    <NavigationStackContext.Provider value={stack}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export function useNavigationStack() {
  return useContext(NavigationStackContext);
}
