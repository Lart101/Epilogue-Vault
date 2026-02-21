"use client";

import { useReader } from "./reader-context";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { ReaderHeader } from "./reader-header";
import { ReaderFooter } from "./reader-footer";
import { ReaderSidebar } from "./reader-sidebar";

// Theme CSS variables (HSL) to override global theme context
const themeStyles = {
  ivory: {
      "--background": "43 30% 98%", // #FFFDF9
      "--foreground": "0 0% 15%",
      "--primary": "35 30% 25%",
      "--muted": "43 20% 94%",
      "--border": "43 15% 90%",
  } as React.CSSProperties,
  "sepia-silk": {
      "--background": "38 28% 93%", // #F4EFE6
      "--foreground": "15 30% 20%",
      "--primary": "15 35% 35%",
      "--muted": "38 20% 88%",
      "--border": "38 15% 85%",
  } as React.CSSProperties,
  obsidian: {
      "--background": "0 0% 4%", // #0A0A0A
      "--foreground": "0 0% 82%",
      "--primary": "38 48% 56%", // Antique Brass
      "--muted": "0 0% 12%",
      "--border": "0 0% 15%",
  } as React.CSSProperties,
  slate: {
      "--background": "0 0% 11%", // #1C1C1C
      "--foreground": "215 20% 65%",
      "--primary": "215 25% 45%",
      "--muted": "0 0% 15%",
      "--border": "0 0% 20%",
  } as React.CSSProperties,
  paper: {
      "--background": "43 30% 94%",
      "--foreground": "27 19% 26%",
      "--primary": "27 25% 40%",
      "--muted": "40 20% 88%",
      "--border": "27 15% 85%",
  } as React.CSSProperties,
};

export function ReaderLayout({ children }: { children: React.ReactNode }) {
  const { settings, showControls, setShowControls } = useReader();

  // Sync global CSS variables for the active theme
  useEffect(() => {
    const root = document.documentElement;
    const currentThemeStyles = themeStyles[settings.theme as keyof typeof themeStyles];
    
    if (currentThemeStyles) {
      Object.entries(currentThemeStyles).forEach(([key, value]) => {
        root.style.setProperty(key, value as string);
      });
    }

    return () => {
      // Cleanup on unmount
      if (currentThemeStyles) {
        Object.keys(currentThemeStyles).forEach((key) => {
          root.style.removeProperty(key);
        });
      }
    };
  }, [settings.theme]);

  // Keyboard shortcuts (Escape to show/hide controls as well)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowControls(!showControls);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showControls, setShowControls]);

  return (
    <div 
      className="fixed inset-0 w-full h-[100dvh] bg-background text-foreground selection:bg-primary/20 transition-colors duration-1000 ease-in-out overflow-hidden"
    >
      <ReaderHeader />
      <ReaderSidebar />
      <ReaderFooter />
      
      <main 
        className="absolute inset-0 z-0 w-full h-full flex flex-col items-center justify-center pt-8 bg-transparent"
      >
          {children}
      </main>
    </div>
  );
}
