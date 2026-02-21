"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserBooks, type UserBook } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Loader2, Book as BookIcon, ChevronLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EchoGenerator } from "@/components/ai/echo-generator";

export default function EchoChronicles() {
  const { user } = useAuth();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<UserBook | null>(null);

  useEffect(() => {
    if (user) {
      getUserBooks(user.id).then((data) => {
        setBooks(data);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/ai-lab" className="flex items-center gap-2 text-muted-foreground hover:text-amber-500 transition-colors text-sm font-medium w-fit">
          <ChevronLeft className="w-4 h-4" />
          Back to Lab
        </Link>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Mic2 className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="font-serif text-4xl font-bold tracking-tight">Echo Chronicles</h1>
            <p className="text-muted-foreground font-serif italic text-sm mt-0.5">
              Select a volume · choose a tone · let the Keepers speak
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedBook ? (
          /* ── Book Grid ───────────────────────────────────── */
          <motion.div key="grid"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6"
          >
            {books.length === 0 ? (
              <div className="p-20 text-center border-2 border-dashed border-border/30 rounded-[2.5rem] space-y-5">
                <BookIcon className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-serif italic text-lg">Your library is empty. Add books to begin.</p>
                <Link href="/library">
                  <Button variant="outline" className="rounded-2xl">Go to Library</Button>
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground font-serif italic">
                  {books.length} {books.length === 1 ? "volume" : "volumes"} in your archive
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {books.map((book, i) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.04, y: -6 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedBook(book)}
                      className="cursor-pointer group"
                    >
                      {/* Cover */}
                      <div className="aspect-[3/4] rounded-[1.5rem] overflow-hidden relative border border-white/10 shadow-xl">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <BookIcon className="w-10 h-10 text-muted-foreground/20" />
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                          <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-500 text-black text-xs font-bold shadow-lg">
                            <Play className="w-3 h-3 fill-current" />
                            Invoke
                          </div>
                        </div>
                      </div>

                      {/* Book info */}
                      <div className="mt-3 space-y-0.5 px-1">
                        <h3 className="font-serif text-sm font-bold truncate group-hover:text-amber-500 transition-colors leading-tight">
                          {book.title}
                        </h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">
                          {book.author}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* ── Echo Generator ──────────────────────────────── */
          <motion.div key="generator"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="p-8 md:p-10 rounded-[2.5rem] bg-card/30 backdrop-blur-3xl border border-border/40 shadow-2xl"
          >
            <EchoGenerator
              book={selectedBook}
              onClose={() => setSelectedBook(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
