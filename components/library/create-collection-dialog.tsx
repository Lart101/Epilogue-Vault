"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "📚", "📖", "📕", "📗", "📘", "📙", "📓", "📒",
  "🎯", "⭐", "❤️", "🔥", "💡", "🌟", "🎨", "🏆",
  "🌍", "🧠", "💻", "🎵", "🔬", "📐", "✍️", "🌿",
  "🚀", "🎭", "👑", "💎", "🌙", "☕", "🎪", "🧩",
];

const COLOR_OPTIONS = [
  "#c5a059", // Antique Brass
  "#4a2c2a", // Mahogany
  "#1a1a1a", // Ink
  "#e57373", "#81c784", "#64b5f6", "#ba68c8",
  "#4dd0e1", "#ffb74d", "#f06292",
];

interface CreateCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; emoji: string; color: string }) => void;
  editData?: { name: string; emoji: string; color: string };
}

export function CreateCollectionDialog({
  open,
  onClose,
  onSubmit,
  editData,
}: CreateCollectionDialogProps) {
  const [name, setName] = useState(editData?.name || "");
  const [emoji, setEmoji] = useState(editData?.emoji || "📚");
  const [color, setColor] = useState(editData?.color || "#c5a059");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), emoji, color });
    if (!editData) {
      setName("");
      setEmoji("📚");
      setColor("#c5a059");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-vault-brass" />
                  <h2 className="font-serif text-lg font-semibold tracking-tight">
                    {editData ? "Refine Collection" : "Induct Collection"}
                  </h2>
                </div>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Collection Name</label>
                    <Input
                      placeholder="e.g., Rare First Editions"
                      autoFocus
                      className="w-full h-12 px-4 rounded-xl glass border-border/40 focus:outline-none focus:border-vault-brass/50 focus:ring-4 focus:ring-vault-brass/5 transition-all text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={30}
                    />
                  </div>

                  {/* Icon Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Symbol</label>
                    <div className="grid grid-cols-6 gap-2">
                      {EMOJI_OPTIONS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEmoji(e)}
                          className={cn(
                            "h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center text-lg",
                            emoji === e
                              ? "bg-vault-brass/15 ring-2 ring-vault-brass/40 scale-110"
                              : "bg-secondary/50 hover:bg-secondary hover:scale-105"
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Illumination</label>
                    <div className="grid grid-cols-6 gap-2">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "h-10 rounded-xl transition-all cursor-pointer border-2",
                            color === c
                              ? "scale-110 border-white shadow-lg"
                              : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full h-12 rounded-xl bg-vault-brass hover:bg-vault-brass/90 text-white font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-lg shadow-vault-brass/10"
                >
                  {editData ? "Preserve Changes" : "Create Collection"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
