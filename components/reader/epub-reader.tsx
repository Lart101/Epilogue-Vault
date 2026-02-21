"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Book, Rendition } from "epubjs";
import { Loader2, Info, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useReader } from "./reader-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EpubReaderProps {
  url: string;
  initialLocation?: string;
}

export function EpubReader({ url, initialLocation }: EpubReaderProps) {
  const { settings, navigation, action, setMeta, setLocation, location: contextLocation, toggleControls, showControls, meta } = useReader();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Init EPIC.js with Ultra Robustness
  useEffect(() => {
    if (!containerRef.current || !url) return;
    let cancelled = false;

    async function init() {
      try {
        const ePub = (await import("epubjs")).default;
        if (cancelled) return;

        // Smart Proxy Handling
        const proxiedUrl = url.startsWith("http") && !url.includes("supabase.co")
            ? `/api/proxy?url=${encodeURIComponent(url)}&ext=.epub` 
            : url;
            
        const book = ePub(proxiedUrl);
        bookRef.current = book;

        // Register cinematic themes
        const rendition = book.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default",
        });
        renditionRef.current = rendition;

        // Fix for Continuous Scroll Upward Teleportation (Google Chrome / Edge)
        // Disables browser's scroll-anchoring which aggressively fights the engine's manual jump
        rendition.hooks.content.register((contents: any) => {
             const doc = contents.document;
             if (doc && doc.documentElement) {
                 doc.documentElement.style.setProperty("overflow-anchor", "none", "important");
             }
             if (doc && doc.body) {
                 doc.body.style.setProperty("overflow-anchor", "none", "important");
             }

             // Keyboard Navigation within Frame
             doc.addEventListener("keydown", (e: KeyboardEvent) => {
                 if (e.key === "ArrowRight" || e.key === " ") {
                     e.preventDefault();
                     renditionRef.current?.next();
                 } else if (e.key === "ArrowLeft") {
                     e.preventDefault();
                     renditionRef.current?.prev();
                 }
             });
        });

        // Use Chapter-Based Progress (Simple mapping of chapters to percentage)
        // No locations.generate() needed, vastly improving load times.

        // Robust Relocation & Progress Management (Chapter-Based)
        rendition.on("relocated", (location: any) => {
          const start = location.start;
          let percentage = 0;
          
          if (bookRef.current && bookRef.current.spine) {
              const spine = bookRef.current.spine as any;
              const spineLength = spine.length || spine.spineItems?.length || 1;
              let currentIndex = start?.index ?? -1;
              
              if (currentIndex === -1 && start?.href) {
                  // Fallback to finding by href in spine
                  const spineItem = bookRef.current.spine.get(start.href);
                  if (spineItem) {
                      currentIndex = spineItem.index;
                  }
              }

              if (currentIndex !== -1) {
                  percentage = currentIndex / Math.max(1, spineLength - 1);
              }
          }

          setMeta({ 
            progress: Math.max(0, Math.min(1, percentage)) * 100,
            chapterTitle: start?.label,
            currentPage: start?.displayed?.page,
            totalPages: start?.displayed?.total
          });

          // Sync to context for persistence
          setLocation({
            cfi: start?.cfi || "",
            percentage: Math.max(0, Math.min(1, percentage)) * 100,
            currentPage: start?.displayed?.page
          });
        });

        // Tap to Toggle Controls (Ultra UX)
        rendition.on("click", () => {
             toggleControls();
        });

        // Load TOC for navigation
        book.loaded.navigation.then((nav) => {
          setMeta({ toc: nav.toc.map(t => ({ label: t.label, href: t.href })) });
        });

        // Initial render
        const loc = contextLocation?.cfi || initialLocation;
        if (loc) {
            await rendition.display(loc);
        } else {
            await rendition.display();
        }

        // Initial Theme Application
        applyStyles(rendition);
        setLoading(false);

        // Robust ResizeObserver for Engine Stability
        let resizeTimer: NodeJS.Timeout;
        let lastWidth = 0;
        let lastHeight = 0;

        const observer = new ResizeObserver((entries) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!cancelled && containerRef.current && renditionRef.current) {
                    try {
                        const { width, height } = entries[0].contentRect;
                        
                        // Ignore initial zero-size calls
                        if (width === 0 || height === 0) return;

                        // Calculate absolute differences
                        const widthDiff = Math.abs(lastWidth - width);
                        const heightDiff = Math.abs(lastHeight - height);

                        // If it's the very first valid read, just set and resize
                        if (lastWidth === 0 && lastHeight === 0) {
                             lastWidth = width;
                             lastHeight = height;
                             renditionRef.current.resize(width, height);
                             return;
                        }

                        // Smart Mobile Check: If width hasn't changed, and height changed by less than 120px...
                        // It is almost certainly a mobile browser address bar showing/hiding on scroll.
                        // We must IGNORE this, otherwiseepub.js will call display() and "teleport" the user.
                        if (widthDiff < 5 && heightDiff < 120) {
                             return; 
                        }

                        lastWidth = width;
                        lastHeight = height;

                        renditionRef.current.resize(width, height);
                    } catch (e) {
                         console.warn("Epub Engine: Resize iteration skipped.");
                    }
                }
            }, 150); 
        });
        
        // Let UI settle before observing
        setTimeout(() => {
            if (!cancelled && containerRef.current) {
                observer.observe(containerRef.current);
                (containerRef.current as any)._observer = observer;
            }
        }, 500);

      } catch (err) {
        if (!cancelled) {
          console.error("Reader Init Failure:", err);
          setError("The archives are momentarily inaccessible. Please try re-entering.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (containerRef.current && (containerRef.current as any)._observer) {
          (containerRef.current as any)._observer.disconnect();
          delete (containerRef.current as any)._observer;
      }
      if (bookRef.current) {
          bookRef.current.destroy();
          bookRef.current = null;
      }
    };
  }, [url]);

  // Utility to apply refined styles to the frame
  const applyStyles = useCallback((rendition: Rendition) => {
      if (!rendition) return;
      
      // Extract computed colors from variable map or fallback to CSS vars
      const themeColors = {
        ivory: { bg: "#FFFDF9", text: "#262626" },
        "sepia-silk": { bg: "#F4EFE6", text: "#432D1F" },
        obsidian: { bg: "#0A0A0A", text: "#D1D1D1" },
        slate: { bg: "#1C1C1C", text: "#A3AFBF" },
        paper: { bg: "#F1EBE0", text: "#423D33" }
      }[settings.theme] || { bg: "transparent", text: "inherit" };

      const googleFontsImport = "@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');";

      const styles = {
        html: {
            "overflow-anchor": "none !important",
        },
        body: {
          "box-sizing": "border-box !important",
          "background-color": `${themeColors.bg} !important`,
          "color": `${themeColors.text} !important`,
          "overflow-anchor": "none !important",
          "font-family": settings.fontFamily === "garamond" ? "'EB Garamond', serif !important" : 
                         settings.fontFamily === "outfit" ? "'Outfit', sans-serif !important" :
                         settings.fontFamily === "inter" ? "'Inter', sans-serif !important" : 
                         settings.fontFamily === "serif" ? "'Playfair Display', serif !important" : "serif",
          "font-size": `${settings.fontSize}% !important`,
          "line-height": `${settings.lineHeight} !important`,
          "text-align": settings.align === "justify" ? "justify" : "left",
          "padding-left": settings.margin === "wide" ? "15% !important" : 
                          settings.margin === "narrow" ? "5% !important" : "10% !important",
          "padding-right": settings.margin === "wide" ? "15% !important" : 
                           settings.margin === "narrow" ? "5% !important" : "10% !important",
          "padding-top": "80px !important",
          "padding-bottom": "80px !important",
        }
      };
      
      rendition.themes.register("custom", { ...styles, ":host": googleFontsImport });
      rendition.themes.select("custom");
  }, [settings]);

  // Apply themes/settings dynamically
  useEffect(() => {
    if (renditionRef.current) {
        applyStyles(renditionRef.current);
    }
  }, [settings, applyStyles]);

  // External Navigation Handlers
  useEffect(() => {
    if (!renditionRef.current || !navigation || !bookRef.current) return;
    
    if (navigation.type === "percentage" && bookRef.current.spine) {
        // Spine-based percentage mapping
        const spine = bookRef.current.spine as any;
        const spineLength = spine.length || spine.spineItems?.length || 1;
        const targetIndex = Math.floor((navigation.value as number) * (spineLength - 1));
        const safeIndex = Math.max(0, Math.min(spineLength - 1, targetIndex));
        
        const targetSpineItem = bookRef.current.spine.get(safeIndex);
        if (targetSpineItem) {
            renditionRef.current.display(targetSpineItem.href);
        }
    } else {
        // Navigate via CFI or Href natively
        renditionRef.current.display(navigation.value as string);
    }
  }, [navigation]);

  // UI Action Handlers (Next/Prev)
  useEffect(() => {
    if (!renditionRef.current || !action) return;
    if (action.type === "next") renditionRef.current.next();
    if (action.type === "prev") renditionRef.current.prev();
  }, [action]);

  // Global Keyboard Handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
        // Only trigger if not typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            renditionRef.current?.next();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            renditionRef.current?.prev();
        }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center bg-background/95 backdrop-blur-md z-50 animate-fade-in">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
           <div className="p-4 rounded-full bg-destructive/5 border border-destructive/10">
               <Info className="w-8 h-8 text-destructive/40" />
           </div>
           <div>
               <h3 className="font-serif text-lg font-semibold mb-1">Archive Error</h3>
               <p className="font-serif text-sm text-muted-foreground">{error}</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence>
        {loading && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-md"
           >
             <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">Opening Vault...</span>
           </motion.div>
        )}
      </AnimatePresence>
      
      {/* The Reader Vessel */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.01 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        ref={containerRef} 
        className="w-full h-full" 
      />

      {/* Invisible Touch Zones (Fallbacks for Mobile/Hidden HUD) */}
      <div className="absolute inset-0 flex pointer-events-none z-10">
        <div 
            onClick={() => renditionRef.current?.prev()} 
            className="w-[30%] h-full pointer-events-auto cursor-w-resize"
        />
        <div className="flex-1" />
        <div 
            onClick={() => renditionRef.current?.next()} 
            className="w-[30%] h-full pointer-events-auto cursor-e-resize"
        />
      </div>
    </div>
  );
}
