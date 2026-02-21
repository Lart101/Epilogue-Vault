"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ReaderControlsProps {
  title: string;
  author: string;
  progress?: number;
  fileType?: string;
  onBack?: () => void;
}

export function ReaderControls({ title, author, progress, fileType }: ReaderControlsProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-xl border-b border-border/30"
    >
      {/* Back */}
      <Link href="/library">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Library</span>
        </Button>
      </Link>

      {/* Title */}
      <div className="flex items-center gap-2 text-center max-w-md truncate">
        <BookOpen className="w-4 h-4 text-vault-brass shrink-0" strokeWidth={1.5} />
        <div className="truncate">
          <p className="text-sm font-serif font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{author}</p>
        </div>
      </div>

      {/* Reading info */}
      <div className="flex items-center gap-2 w-20 justify-end">
        {typeof progress === "number" && progress > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-vault-brass"
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {Math.round(progress)}%
            </span>
          </div>
        )}
        {fileType && !progress && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3 h-3" />
            {fileType}
          </span>
        )}
      </div>
    </motion.header>
  );
}
