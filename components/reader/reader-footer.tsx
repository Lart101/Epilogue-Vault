"use client";

import { useReader } from "./reader-context";
import { motion, AnimatePresence } from "framer-motion";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ReaderFooter() {
  const { showControls, meta, navigate, location, triggerAction } = useReader();
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sync slider with actual progress when not dragging
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(meta.progress);
    }
  }, [meta.progress, isDragging]);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90vw] max-w-3xl z-50 flex justify-center pointer-events-none">
      <AnimatePresence>
        {showControls && (
          <motion.footer
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full px-6 py-4 bg-vault-mahogany/95 backdrop-blur-2xl border border-vault-brass/30 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex flex-col gap-3"
          >
              {/* Context Row */}
              <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-vault-sand/40 font-bold font-mono">Consonance</span>
                    <span className="text-xs text-vault-sand/90 font-bold font-mono tracking-tight">
                      {Math.round(sliderValue || 0)}%
                    </span>
                  </div>
                 
                 {meta.chapterTitle && (
                     <motion.p 
                         initial={{ opacity: 0 }} 
                         animate={{ opacity: 1 }} 
                         className="text-[11px] font-serif italic text-vault-brass/90 truncate max-w-[200px] sm:max-w-xs"
                     >
                       {meta.chapterTitle}
                     </motion.p>
                 )}

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-vault-sand/40 font-bold font-mono">Folio</span>
                    <span className="text-xs text-vault-sand/90 font-bold font-mono tracking-tight">
                       {meta.currentPage && meta.totalPages ? `${meta.currentPage} / ${meta.totalPages}` : "—"}
                    </span>
                  </div>
              </div>

              {/* Cinematic Scrubber Track */}
              <div className="relative h-10 flex items-center gap-4 group px-2">
                   <Button 
                     variant="ghost" 
                     size="icon"
                     onClick={() => triggerAction("prev")}
                     className="h-8 w-8 text-vault-sand/40 hover:text-vault-brass transition-colors pointer-events-auto"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </Button>

                   <div className="relative flex-1 h-10 flex items-center group">
                        {/* Background Track */}
                         <div className="absolute left-0 right-0 h-[4px] bg-white/10 rounded-full overflow-hidden transition-all duration-300 group-hover:h-[6px]">
                             {/* Fill Track */}
                             <div 
                                 className="h-full bg-vault-brass transition-all duration-150 ease-out"
                                 style={{ width: `${sliderValue}%` }}
                             />
                         </div>
                        
                        {/* Input Element (Invisible overlay for interaction) */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.01"
                          value={sliderValue || 0}
                          onChange={(e) => {
                             setIsDragging(true);
                             setSliderValue(parseFloat(e.target.value));
                          }}
                          onMouseUp={(e) => {
                             setIsDragging(false);
                             navigate("percentage", parseFloat(e.currentTarget.value) / 100);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        
                         {/* Floating Glow Thumb */}
                         <motion.div 
                              animate={{ 
                                left: `calc(${sliderValue}%)`, 
                                scale: isDragging ? 1.4 : 1,
                              }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className={cn(
                                  "absolute h-3 w-3 bg-vault-brass rounded-full shadow-[0_0_15px_rgba(197,160,89,0.8)] pointer-events-none -translate-x-1/2 z-10 transition-colors",
                                  isDragging ? "bg-white" : ""
                              )}
                         />
                   </div>

                   <Button 
                     variant="ghost" 
                     size="icon"
                     onClick={() => triggerAction("next")}
                     className="h-8 w-8 text-vault-sand/40 hover:text-vault-brass transition-colors pointer-events-auto"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </Button>
              </div>

          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
