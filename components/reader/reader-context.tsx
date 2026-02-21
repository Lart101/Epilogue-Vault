"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type ReaderTheme = "ivory" | "obsidian" | "sepia-silk" | "slate" | "paper";
export type ReaderFont = "garamond" | "inter" | "serif" | "sans" | "outfit";
interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number;
  lineHeight: number;
  margin: "narrow" | "normal" | "wide";
  align: "justify" | "left";
}

interface ReaderState {
  settings: ReaderSettings;
  showControls: boolean;
  meta: {
    title: string;
    author: string;
    fileType?: string;
    chapterTitle?: string;
    totalPages?: number;
    currentPage?: number;
    progress: number;
    toc?: { label: string; href: string }[];
  };
  navigation: {
    type: "cfi" | "percentage" | "chapter";
    value: string | number;
    timestamp: number;
  } | null;
  location: {
    cfi: string;
    percentage: number;
    currentPage?: number;
  };
  action: {
    type: "next" | "prev";
    timestamp: number;
  } | null;
}

interface ReaderContextType extends ReaderState {
  setSettings: (settings: Partial<ReaderSettings>) => void;
  setShowControls: (show: boolean) => void;
  setMeta: (meta: Partial<ReaderState["meta"]>) => void;
  setLocation: (location: ReaderState["location"]) => void;
  toggleControls: () => void;
  navigate: (type: "cfi" | "percentage" | "chapter", value: string | number) => void;
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  toggleSidebar: () => void;
  triggerAction: (type: "next" | "prev") => void;
  isMounted: boolean;
}

const ReaderContext = createContext<ReaderContextType | null>(null);

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "ivory",
  fontFamily: "garamond",
  fontSize: 100,
  lineHeight: 1.6,
  margin: "normal",
  align: "justify",
};

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  // Load settings from local storage if available
  const [settings, setSettingsState] = useState<ReaderSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vault-reader-settings");
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {
          console.error("Failed to parse saved reader settings", e);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [showControls, setShowControlsState] = useState(true);
  const [meta, setMetaState] = useState<ReaderState["meta"]>({
    title: "",
    author: "",
    progress: 0,
  });
  const [location, setLocationState] = useState<ReaderState["location"]>({
    cfi: "",
    percentage: 0,
    currentPage: 0,
  });
  const [navigation, setNavigationState] = useState<ReaderState["navigation"]>(null);
  const [action, setActionState] = useState<ReaderState["action"]>(null);

  const setSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem("vault-reader-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const setShowControls = useCallback((show: boolean) => setShowControlsState(show), []);
  const toggleControls = useCallback(() => setShowControlsState((prev) => !prev), []);
  
  const [showSidebar, setShowSidebarState] = useState(false);
  const setShowSidebar = useCallback((show: boolean) => setShowSidebarState(show), []);
  const toggleSidebar = useCallback(() => setShowSidebarState((prev) => !prev), []);
  
  const setMeta = useCallback((newMeta: Partial<ReaderState["meta"]>) => {
    setMetaState((prev) => ({ ...prev, ...newMeta }));
  }, []);

  const setLocation = useCallback((newLocation: ReaderState["location"]) => {
    setLocationState(newLocation);
  }, []);

  const navigate = useCallback((type: "cfi" | "percentage" | "chapter", value: string | number) => {
    setNavigationState({ type, value, timestamp: Date.now() });
  }, []);

  const triggerAction = useCallback((type: "next" | "prev") => {
    setActionState({ type, timestamp: Date.now() });
  }, []);

  const contextValue = useMemo(() => ({
    settings,
    showControls,
    meta,
    location,
    navigation,
    action,
    setSettings,
    setShowControls,
    toggleControls,
    setMeta,
    setLocation,
    navigate,
    showSidebar,
    setShowSidebar,
    toggleSidebar,
    triggerAction,
    isMounted,
  }), [settings, showControls, meta, location, navigation, action, showSidebar, setSettings, setShowControls, toggleControls, setMeta, setLocation, navigate, setShowSidebar, toggleSidebar, triggerAction, isMounted]);

  return (
    <ReaderContext.Provider value={contextValue}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error("useReader must be used within a ReaderProvider");
  }
  return context;
}
