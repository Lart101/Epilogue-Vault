"use client";

import { useReader } from "./reader-context";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, List, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReaderSettings } from "./reader-settings";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ReaderHeader() {
  const { showControls, meta, setLocation, location: currentLocation, showSidebar, toggleSidebar, setShowControls, triggerAction } = useReader();

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl z-50 flex justify-center pointer-events-none">
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex items-center justify-between w-full px-2 py-2 bg-vault-mahogany/95 backdrop-blur-2xl border border-vault-brass/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-xl pointer-events-auto"
          >
              {/* Left: Back & TOC */}
              <div className="flex items-center gap-1">
                <Link href="/library">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-vault-sand/70 hover:text-vault-sand hover:bg-white/10 transition-all">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "h-10 w-10 rounded-lg transition-all",
                        showSidebar ? "bg-white/20 text-vault-sand" : "text-vault-sand/70 hover:text-vault-sand hover:bg-white/10"
                    )}
                    onClick={toggleSidebar}
                >
                  {showSidebar ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
                </Button>
              </div>

              {/* Center: Title */}
              <div className="flex-1 text-center px-4 overflow-hidden flex flex-col items-center justify-center cursor-pointer" onClick={() => setShowControls(false)}>
                  <h1 className="font-serif text-sm sm:text-base font-bold truncate w-full max-w-[150px] sm:max-w-xs tracking-tight text-vault-sand/90">
                      {meta.title || "Untitled Archive"}
                  </h1>
                  <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] text-vault-sand/40 uppercase tracking-[0.2em] font-bold font-mono">
                      <span className="truncate max-w-[80px] sm:max-w-[100px]">{meta.author || "Unknown Author"}</span>
                      {meta.chapterTitle && (
                        <>
                          <span className="opacity-30">•</span>
                          <span className="truncate max-w-[100px] sm:max-w-[150px] italic font-serif normal-case tracking-normal text-vault-brass/90">{meta.chapterTitle}</span>
                        </>
                      )}
                  </div>
              </div>

            {/* Right: Settings & Navigation */}
            <div className="flex items-center gap-1 justify-end pr-1">
               <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-vault-sand/70 hover:text-vault-sand hover:bg-white/10 rounded-lg transition-all"
                  onClick={() => triggerAction("prev")}
              >
                  <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-vault-sand/70 hover:text-vault-sand hover:bg-white/10 rounded-lg transition-all"
                  onClick={() => triggerAction("next")}
              >
                  <ChevronRight className="h-5 w-5" />
              </Button>
              <ReaderSettings />
            </div>
          </motion.header>
        )}
      </AnimatePresence>
    </div>
  );
}
