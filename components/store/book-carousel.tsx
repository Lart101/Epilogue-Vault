"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreBook } from "@/lib/gutendex";

interface BookCarouselProps {
  books: StoreBook[];
  onSelect: (index: number) => void;
  loading?: boolean;
}

export function BookCarousel({ books, onSelect, loading }: BookCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-vault-brass" />
          <h2 className="font-serif text-xl font-semibold">Featured</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex gap-5 overflow-hidden pb-4 -mx-6 px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px]">
              <div className="aspect-[3/4] rounded-2xl bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Carousel */}
      {!loading && books.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-snap-x pb-4 -mx-6 px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {books.map((book, i) => (
            <motion.button
              key={book.key}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              onClick={() => onSelect(i)}
              className="group flex-shrink-0 w-[280px] cursor-pointer text-left"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-black/5 border border-border/30 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-vault-brass/10 group-hover:-translate-y-1">
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="280px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-vault-brass/20 to-vault-paper flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-vault-brass/30" strokeWidth={1} />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-serif text-lg font-bold text-white leading-tight">
                    {book.title}
                  </h3>
                  <p className="text-sm text-white/70 mt-1">{book.author}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}
