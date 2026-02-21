"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-[500] transition-colors duration-500",
            variant === "danger" ? "bg-black/80 shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]" : "bg-black/60"
          )}
        />
      )}
      
      {open && (
        <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-[501] pointer-events-none px-4"
          >
            <div className={cn(
              "pointer-events-auto w-full max-w-sm backdrop-blur-3xl rounded-[2rem] overflow-hidden border transition-all duration-300",
              variant === "danger" 
                ? "bg-[#0a0505]/95 border-red-900/50 shadow-[0_0_50px_-12px_rgba(220,38,38,0.25)]" 
                : "bg-popover/95 border-border/50 shadow-2xl shadow-black/30"
            )}>
              {/* Top accent glow */}
              <div className={cn(
                "h-1.5 w-full", 
                variant === "danger" ? "bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-[0_2px_20px_rgba(239,68,68,0.8)]" : "bg-amber-500"
              )} />

              <div className="p-7 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl flex-shrink-0 mt-0.5",
                    variant === "danger" 
                      ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                      : "bg-amber-500/10 text-amber-500"
                  )}>
                    <AlertTriangle className={cn("w-6 h-6", variant === "danger" && "animate-pulse")} />
                  </div>
                  <div className="space-y-1">
                    <h3 className={cn(
                      "font-serif font-bold text-xl leading-tight",
                      variant === "danger" ? "text-red-50" : "text-foreground"
                    )}>
                      {title}
                    </h3>
                    <p className={cn(
                      "text-sm font-serif italic leading-relaxed",
                      variant === "danger" ? "text-red-200/60" : "text-muted-foreground"
                    )}>
                      {description}
                    </p>
                  </div>
                  <button onClick={onClose}
                    className="ml-auto flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="ghost" onClick={onClose} disabled={isLoading}
                    className="flex-1 h-11 rounded-2xl border border-border/40 hover:bg-muted/50">
                    {cancelLabel}
                  </Button>
                  <Button onClick={onConfirm} disabled={isLoading}
                    className={cn(
                      "flex-1 h-12 rounded-2xl font-bold transition-all duration-300 text-sm tracking-wide uppercase",
                      variant === "danger"
                        ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] border border-red-500/50"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                    )}>
                    {isLoading ? "Please wait..." : confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
