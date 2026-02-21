"use client";

import { useState } from "react";
import { useReader, type ReaderFont, type ReaderTheme } from "./reader-context";
import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings, Type, Minus, Plus, AlignJustify, AlignLeft, Sun, Moon, Cloud, Check, Maximize, X } from "lucide-react";

export function ReaderSettings() {
  const { settings, setSettings, meta } = useReader();
  const [open, setOpen] = useState(false);
  const isPdf = meta.fileType === "pdf";

  const themes: { id: ReaderTheme; label: string; color: string; textColor: string; sub: string }[] = [
    { id: "ivory", label: "Morning Velllum", color: "bg-[#FFFDF9]", textColor: "text-[#3C3C3C]", sub: "Early Scholarship" },
    { id: "sepia-silk", label: "Sepia Archive", color: "bg-[#F4EFE6]", textColor: "text-[#5D4037]", sub: "Heritage Resonance" },
    { id: "obsidian", label: "Midnight Ink", color: "bg-[#0A0A0A]", textColor: "text-[#D1D1D1]", sub: "Shadowed Vault" },
    { id: "slate", label: "Dusk Ledger", color: "bg-[#1C1C1C]", textColor: "text-[#94A3B8]", sub: "Quiet Reflection" },
    { id: "paper", label: "Classic Papyrus", color: "bg-[#f5f1e8]", textColor: "text-[#4a3c31]", sub: "Traditionalist" },
  ];

  const fonts: { id: ReaderFont; label: string; family: string }[] = [
    { id: "garamond", label: "EB Garamond", family: "font-serif" },
    { id: "outfit", label: "Outfit", family: "font-sans" },
    { id: "inter", label: "Inter", family: "font-sans" },
    { id: "serif", label: "Standard Serif", family: "font-serif" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10">
          <Type className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-4 mr-4 max-h-[75vh] overflow-y-auto scrollbar-hide backdrop-blur-3xl bg-vault-mahogany/95 border-vault-brass/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-xl z-[100] text-vault-sand">
        <div className="space-y-4">
          
          {/* Header with Hide Button */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-vault-sand">Aesthetics</h3>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setOpen(false)}
                className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-vault-sand/60 hover:text-vault-sand rounded-lg"
            >
                Secure
            </Button>
          </div>

          <hr className="border-vault-brass/10" />
          
          {/* Theme Selection */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Atmospheric Themes</h4>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ theme: theme.id })}
                  className={`
                    group relative flex items-center gap-2 p-2 rounded-xl transition-all border
                    ${settings.theme === theme.id ? "border-vault-brass bg-white/10 ring-1 ring-vault-brass/30" : "border-white/5 hover:border-white/20 hover:bg-white/5"}
                  `}
                >
                  <div className={`w-8 h-8 rounded-xl border-white/10 shadow-sm ${theme.color} shrink-0 flex items-center justify-center`}>
                     {settings.theme === theme.id && <Check className={`w-3 h-3 ${theme.textColor}`} />}
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/90">
                      {theme.label}
                    </span>
                    <span className="block text-[9px] text-white/50 italic">
                      {theme.sub}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!isPdf && (
            <>

              {/* Margins & Alignment */}
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                     <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Margins</h4>
                     <div className="flex bg-white/5 rounded-lg p-1">
                         {(["narrow", "normal", "wide"] as const).map((m) => (
                             <button
                                 key={m}
                                 onClick={() => setSettings({ margin: m })}
                                 className={`
                                     flex-1 py-1 rounded-md flex items-center justify-center transition-all
                                     ${settings.margin === m ? "bg-white/10 shadow-sm text-white" : "text-white/50 hover:text-white"}
                                 `}
                                 title={m.charAt(0).toUpperCase() + m.slice(1)}
                             >
                                 <Maximize className={`w-3 h-3 ${m === "narrow" ? "rotate-90" : m === "wide" ? "" : "scale-75"}`} />
                             </button>
                         ))}
                     </div>
                 </div>
                 
                 <div className="space-y-2">
                     <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Align</h4>
                     <div className="flex bg-white/5 rounded-lg p-1">
                         <button
                             onClick={() => setSettings({ align: "left" })}
                             className={`
                                 flex-1 py-1.5 rounded-md flex items-center justify-center transition-all
                                 ${settings.align === "left" ? "bg-white/10 shadow-sm text-white" : "text-white/50 hover:text-white"}
                             `}
                         >
                             <AlignLeft className="w-3 h-3" />
                         </button>
                         <button
                             onClick={() => setSettings({ align: "justify" })}
                             className={`
                                 flex-1 py-1.5 rounded-md flex items-center justify-center transition-all
                                 ${settings.align === "justify" ? "bg-white/10 shadow-sm text-white" : "text-white/50 hover:text-white"}
                             `}
                         >
                             <AlignJustify className="w-3 h-3" />
                         </button>
                     </div>
                 </div>
              </div>

              <hr className="border-vault-brass/10" />

              {/* Typography */}
              <div className="space-y-2">
                 <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Font Family</h4>
                 <div className="flex p-1 bg-white/5 rounded-lg">
                    {fonts.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => setSettings({ fontFamily: font.id })}
                        className={`
                          flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                          ${settings.fontFamily === font.id ? "bg-white/10 shadow-sm text-white" : "text-white/50 hover:text-white"}
                          ${font.family}
                        `}
                      >
                        {font.label}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Size</h4>
                   <span className="text-xs tabular-nums text-white/60">{settings.fontSize}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shrink-0 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={() => setSettings({ fontSize: Math.max(50, settings.fontSize - 10) })}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ fontSize: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shrink-0 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={() => setSettings({ fontSize: Math.min(200, settings.fontSize + 10) })}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

               {/* Line Height */}
               <div className="space-y-2">
                 <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Spacing</h4>
                 <div className="flex items-center gap-2">
                     {[1.2, 1.6, 2.0].map((lh) => (
                        <button
                            key={lh}
                            onClick={() => setSettings({ lineHeight: lh })}
                            className={`
                                flex-1 h-8 rounded-md flex items-center justify-center border transition-all
                                ${settings.lineHeight === lh 
                                    ? "border-primary bg-primary/20 text-primary" 
                                    : "border-white/10 bg-transparent text-white/60 hover:bg-white/10"}
                            `}
                        >
                            <AlignJustify className="w-4 h-4" style={{ transform: `scaleY(${lh * 0.6})` }} />
                        </button>
                     ))}
                 </div>
              </div>
            </>
          )}

        </div>
      </PopoverContent>
    </Popover>
  );
}
