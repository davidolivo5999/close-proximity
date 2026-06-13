import React, { createContext, useContext, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

// Maps each tab root path to the last full path visited under it
const TabHistoryContext = createContext(null);

// Tab roots — order matters for matching (most specific first if needed)
export const TAB_ROOTS = ["/", "/friends", "/search", "/requests", "/profile"];

export function getTabRoot(pathname) {
  // Find which tab root this path belongs to
  if (pathname === "/") return "/";
  for (const root of TAB_ROOTS) {
    if (root !== "/" && pathname.startsWith(root)) return root;
  }
  // /user/:id is "owned" by whichever tab navigated there — handled via stored state
  return null;
}

export function TabHistoryProvider({ children }) {
  // Store the last known path for each tab root
  const tabPaths = useRef({
    "/": "/",
    "/friends": "/friends",
    "/search": "/search",
    "/requests": "/requests",
    "/profile": "/profile",
  });

  const setTabPath = useCallback((tabRoot, path) => {
    tabPaths.current[tabRoot] = path;
  }, []);

  const getTabPath = useCallback((tabRoot) => {
    return tabPaths.current[tabRoot] || tabRoot;
  }, []);

  return (
    <TabHistoryContext.Provider value={{ setTabPath, getTabPath }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  return useContext(TabHistoryContext);
}