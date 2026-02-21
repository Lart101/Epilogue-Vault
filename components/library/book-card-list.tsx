"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, Clock, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { type UserBook, type Collection } from "@/lib/db";
import Link from "next/link";

interface BookCardListProps {
  book: UserBook;
  index?: number;
  onDetails: () => void;
}

export function BookCardList({ book, index = 0, onDetails }: BookCardListProps) {
  const progress = book.readingProgress?.percentage || 0;
  const hasStarted = progress > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
    >
      <div className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 transition-all duration-200 hover:shadow-md hover:shadow-vault-brass/5 hover:border-vault-brass/30">
        {/* Cover Thumbnail */}
        <Link href={`/reader/${book.id}`} className="shrink-0">
          <div className="relative w-12 aspect-[2/3] overflow-hidden rounded bg-secondary">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-vault-brass/10 to-vault-brass/5">
                <BookOpen className="w-5 h-5 text-vault-brass/30" strokeWidth={1} />
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/reader/${book.id}`}>
            <h3 className="font-serif text-sm font-semibold leading-snug truncate group-hover:text-vault-brass transition-colors">
            {book.title}
          </h3>
          </Link>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author}</p>
          {hasStarted && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={progress} className="h-1 flex-1 max-w-[120px]" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="uppercase tracking-wider font-medium">{book.fileType}</span>
          {hasStarted && book.readingProgress?.lastReadAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recently
            </span>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onDetails();
          }}
          className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
