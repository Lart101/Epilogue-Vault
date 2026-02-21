"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreBook } from "@/lib/gutendex";

interface BookPreviewModalProps {
  book: StoreBook | null;
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  adding?: boolean;
  added?: boolean;
}

export function BookPreviewModal({
  book,
  open,
  onClose,
  onAdd,
  adding,
  added,
}: BookPreviewModalProps) {
  if (!book) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 mx-auto max-w-2xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-vault-brass/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-vault-brass" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-lg font-semibold leading-tight truncate">
                    {book.title}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {book.author}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none font-sans text-foreground">
                <div className="text-base leading-relaxed mb-4 whitespace-pre-line">
                  {book.summary ? (
                      book.summary
                  ) : (
                      "This is a public domain edition provided by Project Gutenberg."
                  )}
                  {book.downloadCount > 0 && <span className="block mt-2 text-sm text-muted-foreground">Downloaded {book.downloadCount.toLocaleString()} times.</span>}
                </div>

                {/* Subjects */}
                {book.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4 mb-6">
                    {book.subjects.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="rounded-xl bg-secondary/50 border border-border/30 p-6 text-center">
                  <BookOpen className="w-8 h-8 text-vault-brass/40 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">
                    Add this book to your library to keep it in your personal collection.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={onClose} className="cursor-pointer">
                Close
              </Button>
              <Button
                onClick={onAdd}
                disabled={adding || added}
                className="bg-vault-brass hover:bg-vault-brass/90 text-white cursor-pointer"
              >
                {adding
                  ? "Adding..."
                  : added
                  ? "Added to Library ✓"
                  : "Add to Library"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
