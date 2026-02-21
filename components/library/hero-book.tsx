"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Play, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { type UserBook } from "@/lib/db";
import { cn } from "@/lib/utils";

interface HeroBookProps {
  book: UserBook;
}

export function HeroBook({ book }: HeroBookProps) {
  const progress = book.readingProgress?.percentage || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0 }}
      className="relative w-full overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl group"
    >
      {/* Blurred Background */}
      <div className="absolute inset-0 z-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt="Background"
            fill
            className="object-cover opacity-20 blur-3xl scale-110"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vault-mahogany/10 to-secondary opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-background/20" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
        {/* Cover Art */}
        <Link href={`/reader/${book.id}`} className="shrink-0 relative group/cover">
          <div className="relative w-32 h-48 md:w-44 md:h-64 rounded-lg shadow-2xl overflow-hidden border border-white/10 transition-transform duration-700 group-hover/cover:scale-105 group-hover/cover:rotate-1">
            {/* Spine Shadow */}
            <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-gradient-to-r from-black/30 to-transparent z-20" />

            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 128px, 176px"
              />
            ) : (
              <div className="flex w-full h-full items-center justify-center bg-secondary">
                <BookOpen className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
              </div>
            )}
             {/* Read Overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-14 h-14 rounded-full bg-vault-mahogany/80 backdrop-blur-md flex items-center justify-center text-vault-sand border border-white/10 shadow-xl">
                    <Play className="w-6 h-6 ml-1 fill-current" />
                  </div>
              </div>
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 text-center md:text-left space-y-4 max-w-2xl">
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vault-mahogany/5 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/10"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Resuming Resonance</span>
            </motion.div>
            
            <Link href={`/reader/${book.id}`} className="block">
                <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-foreground hover:text-primary transition-colors">
                {book.title}
                </h2>
            </Link>
            <p className="text-lg text-muted-foreground font-medium">{book.author}</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Vault Progress</span>
              <span className="text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 w-full bg-secondary/50" indicatorClassName="bg-vault-brass shadow-[0_0_10px_rgba(197,160,89,0.3)]" />
          </div>

          <div className="pt-4 flex items-center justify-center md:justify-start gap-4">
            <Link href={`/reader/${book.id}`} className="w-full md:w-auto">
                <button className="w-full md:w-auto px-10 py-4 rounded-xl bg-primary text-vault-sand font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl flex items-center justify-center gap-3 group/btn hover:-translate-y-0.5 active:translate-y-0">
                    <BookOpen className="w-4 h-4" />
                    <span>Enter the Vault</span>
                    <Play className="w-3 h-3 ml-1 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all fill-current" />
                </button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
