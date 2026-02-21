"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, Eye, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StoreBook } from "@/lib/gutendex";

interface StoreBookCardProps {
  book: StoreBook;
  index?: number;
  onPreview: () => void;
  onAdd: () => void;
  adding?: boolean;
  added?: boolean;
}

export function StoreBookCard({
  book,
  index = 0,
  onPreview,
  onAdd,
  adding,
  added,
}: StoreBookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-vault-brass/10 hover:-translate-y-1">
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              priority={index < 4}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-muted/50 to-muted">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-2" strokeWidth={1} />
              <span className="text-xs text-muted-foreground/50 font-medium">No Cover</span>
            </div>
          )}

          {/* Availability Badge */}
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            <span className="bg-emerald-500/90 text-white backdrop-blur-md text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Free eBook
            </span>
          </div>

          {/* Download Count Badge (Instead of Year) */}
           <div className="absolute top-2 right-2 z-10">
             <span className="bg-black/60 text-white/80 backdrop-blur-md text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
               <Eye className="w-3 h-3" />
               {(book.downloadCount / 1000).toFixed(1)}k
             </span>
           </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-9 text-xs font-medium bg-white/95 text-black hover:bg-white shadow-lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreview();
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Preview Details
            </Button>
            <Button
              size="sm"
              className={cn(
                "w-full h-9 text-xs font-medium shadow-lg transition-colors",
                added
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-vault-brass hover:bg-vault-brass/90 text-white"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!added) onAdd();
              }}
              disabled={adding || added}
            >
              {adding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : added ? (
                <>Added to Library</>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add to Library
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3.5 space-y-1 bg-card">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground/90 group-hover:text-vault-brass transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
        </div>
      </div>
    </motion.div>
  );
}
