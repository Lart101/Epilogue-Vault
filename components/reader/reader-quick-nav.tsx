"use client";

import { useReader } from "./reader-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReaderQuickNav() {
  const { triggerAction, showControls } = useReader();

  return (
    <div 
      className={`
        absolute bottom-8 left-1/2 -translate-x-1/2 z-40 
        transition-all duration-500 ease-in-out
        ${showControls ? "opacity-0 pointer-events-none translate-y-8" : "opacity-100 pointer-events-auto translate-y-0"}
      `}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-vault-mahogany border border-vault-brass/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-xl relative overflow-hidden">
        {/* Ribbon Sheen */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
        
        <Button 
          variant="ghost" 
          onClick={() => triggerAction("prev")}
          className="flex items-center gap-2 h-10 px-6 rounded-lg text-vault-sand/60 hover:text-vault-sand hover:bg-white/10 font-bold tracking-[0.2em] text-[10px] uppercase transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </Button>
        <div className="w-[1px] h-4 bg-vault-brass/20" />
        <Button 
          variant="ghost" 
          onClick={() => triggerAction("next")}
          className="flex items-center gap-2 h-10 px-6 rounded-lg text-vault-sand/60 hover:text-vault-sand hover:bg-white/10 font-bold tracking-[0.2em] text-[10px] uppercase transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
