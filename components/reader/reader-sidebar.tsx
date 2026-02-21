"use client";

import { useReader } from "./reader-context";
import { cn } from "@/lib/utils";
import { List, X, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function ReaderSidebar() {
  const { showSidebar, setShowSidebar, meta, location: currentLocation, navigate } = useReader();

  // Close sidebar on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showSidebar && e.key === "Escape") {
            setShowSidebar(false);
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSidebar, setShowSidebar]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
            "fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-sm",
            showSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowSidebar(false)} 
      />

      {/* Sidebar Panel */}
      <div className={cn(
          "fixed top-4 left-4 bottom-4 w-[85vw] sm:w-[350px] bg-vault-mahogany/95 backdrop-blur-3xl border border-vault-brass/30 z-50 shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden",
          showSidebar ? "translate-x-0" : "-translate-x-[120%]"
      )}>
           <div className="p-6 border-b border-vault-brass/10 flex items-center justify-between bg-white/5">
              <div className="flex flex-col gap-0.5">
                  <h2 className="font-serif text-lg flex items-center gap-2 text-vault-sand/90 font-bold tracking-tight">
                    <Book className="w-4 h-4 text-vault-brass" />
                    Archive Index
                  </h2>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-vault-sand/40 font-bold font-mono">Consonance Maps</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="h-10 w-10 text-vault-sand/50 hover:text-vault-sand hover:bg-white/10 rounded-lg transition-all">
                  <X className="w-5 h-5" />
              </Button>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
              <div className="flex flex-col p-3 gap-1">
                  {meta.toc && meta.toc.length > 0 ? (
                      meta.toc.map((item, i) => (
                          <button
                              key={i}
                              onClick={() => {
                                  navigate("cfi", item.href);
                                  setShowSidebar(false);
                              }}
                              className={cn(
                                  "flex items-center gap-4 px-4 py-3 text-sm text-left rounded-xl transition-all border border-transparent group",
                                  currentLocation.cfi === item.href 
                                      ? "bg-white/10 text-vault-sand border-vault-brass/20 shadow-sm" 
                                      : "text-vault-sand/60 hover:bg-white/5 hover:text-vault-sand"
                              )}
                          >
                               <span className={cn(
                                  "w-6 text-[10px] tabular-nums text-right shrink-0 font-mono transition-colors",
                                  currentLocation.cfi === item.href ? "text-vault-brass font-bold" : "text-vault-sand/30 group-hover:text-vault-sand/60"
                              )}>
                                  {(i + 1).toString().padStart(2, '0')}
                              </span>
                              <span className="line-clamp-1 font-medium">{item.label}</span>
                          </button>
                      ))
                  ) : (
                       <div className="p-12 text-center text-white/50 flex flex-col items-center gap-2">
                          <Book className="w-8 h-8 opacity-20" />
                          <span className="text-xs italic font-serif">
                            This volume contains no marked segments.
                          </span>
                      </div>
                  )}
              </div>
           </div>
      </div>
    </>
  );
}
