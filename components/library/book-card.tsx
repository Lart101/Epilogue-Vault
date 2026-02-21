"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BookOpen, Clock, MoreVertical, Edit, Trash2, FolderPlus, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { type UserBook } from "@/lib/db";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookCardProps {
  book: UserBook;
  index?: number;
  onDetails?: () => void;
  // We can expand this to accept separate handlers if needed, 
  // but for now onDetails opens the modal which has these actions.
  // Ideally, we should pass specific handlers for direct actions.
}

export function BookCard({ book, index = 0, onDetails }: BookCardProps) {
  const progress = book.readingProgress?.percentage || 0;
  const hasStarted = progress > 0;

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const rotateX = useTransform(mouseY, [-50, 50], [5, -5]);
  const rotateY = useTransform(mouseX, [-50, 50], [-5, 5]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
      className="group perspective-1000"
      style={{ perspective: 1000 }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative overflow-hidden rounded-lg bg-card border border-border/40 shadow-sm transition-shadow duration-500 hover:shadow-2xl hover:shadow-vault-mahogany/10"
      >
        {/* 3D Spine Effect (Left Border) */}
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/10 z-20 pointer-events-none" />

        {/* Cover Image */}
        <Link href={`/reader/${book.id}`}>
          <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                priority={index < 4}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-vault-mahogany/10 to-vault-mahogany/5">
                <BookOpen className="w-12 h-12 text-vault-mahogany/20" strokeWidth={1} />
              </div>
            )}

            {/* Hover Overlay with "Open" Button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 whileHover={{ scale: 1.1 }}
                 className="w-12 h-12 rounded-full bg-vault-mahogany/80 backdrop-blur-md flex items-center justify-center text-vault-sand border border-white/20 shadow-xl"
               >
                 <Play className="w-5 h-5 ml-0.5 fill-current" />
               </motion.div>
            </div>

            {/* Reading progress overlay (Bottom) */}
            {hasStarted && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                  <div 
                    className="h-full bg-vault-brass shadow-[0_0_8px_rgba(197,160,89,0.4)]" 
                    style={{ width: `${progress}%` }} 
                  />
              </div>
            )}

            {/* File type badge */}
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-white/90 uppercase tracking-wider shadow-sm border border-white/10">
                {book.fileType}
              </span>
            </div>
          </div>
        </Link>

        {/* Info & Actions */}
        <div className="p-3 bg-card/95 backdrop-blur-sm relative z-10">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/reader/${book.id}`} className="flex-1 min-w-0 group/text">
              <h3 className="font-serif text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover/text:text-primary transition-colors">
                {book.title}
              </h3>
            </Link>
            
            {/* Context Menu Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="shrink-0 p-1 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                 <Link href={`/reader/${book.id}`} className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Read
                    </DropdownMenuItem>
                 </Link>
                 <DropdownMenuItem onClick={onDetails} className="cursor-pointer">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Collections...
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={onDetails} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Details
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem 
                   onClick={onDetails} 
                   className="text-destructive focus:text-destructive cursor-pointer"
                 >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {book.author}
          </p>
          
          {hasStarted && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80 font-mono">
                {Math.round(progress)}% ARCHIVED
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
