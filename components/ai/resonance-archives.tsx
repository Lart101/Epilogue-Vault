"use client";

import { useState, useEffect, useRef } from "react";
import { 
  AiArtifact, 
  getUserAiArtifacts, 
  trashAiArtifact,
  getUserBooks,
  UserBook
} from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic2, Calendar, Trash2, Play, BookOpen, 
  Clock, Sparkles, Layers, ChevronLeft, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ResonanceArchivesProps {
  userId: string;
  onReplay: (artifact: AiArtifact) => void;
  onOpenDetail?: (artifact: AiArtifact) => void;
}

export function ResonanceArchives({ userId, onReplay, onOpenDetail }: ResonanceArchivesProps) {
  const [artifacts, setArtifacts] = useState<AiArtifact[]>([]);
  const [books, setBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Series always show. Only show standalone episodes (not associated with any series artifact)
  const seriesIds = artifacts
    .filter(a => a.type === "podcast-series")
    .map(a => a.book_id);
  
  const standaloneEpisodes = artifacts.filter(
    a => a.type === "podcast" && !seriesIds.includes(a.book_id)
  );
  
  // Unified list: series first, then standalone episodes
  const unified = [
    ...artifacts.filter(a => a.type === "podcast-series"),
    ...standaloneEpisodes,
  ];

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [artifactData, bookData] = await Promise.all([
        getUserAiArtifacts(userId),
        getUserBooks(userId)
      ]);
      setArtifacts(artifactData);
      setBooks(bookData);
    } catch (error) {
      console.error("Failed to load archive data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrash = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await trashAiArtifact(userId, id);
      setArtifacts(artifacts.filter(a => a.id !== id));
      toast.success("Resonance moved to recovery archives.");
    } catch (error) {
      toast.error("Failed to discard resonance.");
    }
  };

  const getBookForArtifact = (bookId: string | null): UserBook | null => {
    if (!bookId) return null;
    return books.find(b => b.id === bookId) ?? null;
  };

  if (isLoading) {
    return (
      <div className="space-y-12">
        <div className="h-8 w-48 bg-muted/20 animate-pulse rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[2/3] rounded-[2rem] bg-muted/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (artifacts.length === 0) return null;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold italic flex items-center gap-3 tracking-tight">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Mic2 className="w-6 h-6 text-amber-500" />
            </div>
            Resonance Archives
          </h2>
          <p className="text-sm text-muted-foreground font-serif italic max-w-lg">
            A Netflix-inspired sanctuary for your distilled echoes. Revisit your multiversal narratives.
          </p>
        </div>
      </div>

      {/* Single unified archive row */}
      {unified.length > 0 && (
        <ArchiveRow 
          title="Your Resonance Archives" 
          subtitle="Series blueprints and standalone echoes. Click any series to explore its episodes."
          artifacts={unified}
          getBook={getBookForArtifact}
          onCardClick={(a) => a.type === "podcast-series" ? (onOpenDetail || onReplay)(a) : onReplay(a)}
          onTrash={handleTrash}
        />
      )}
    </div>
  );
}

interface ArchiveRowProps {
  title: string;
  subtitle: string;
  artifacts: AiArtifact[];
  getBook: (id: string | null) => UserBook | null;
  onCardClick: (a: AiArtifact) => void;
  onTrash: (e: React.MouseEvent, id: string) => void;
}

function ArchiveRow({ title, subtitle, artifacts, getBook, onCardClick, onTrash }: ArchiveRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-6 relative group/row">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <h3 className="text-2xl font-serif font-bold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground italic font-serif opacity-70">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => scroll("left")}
            className="rounded-full bg-muted/20 hover:bg-muted/40 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => scroll("right")}
            className="rounded-full bg-muted/20 hover:bg-muted/40 opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar px-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {artifacts.map((artifact, index) => {
          const book = getBook(artifact.book_id);
          return (
            <motion.div
              key={artifact.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-[280px] snap-start"
            >
              <div 
                className="group relative aspect-[3/4] rounded-[2rem] overflow-hidden border border-white/10 cursor-pointer shadow-2xl transition-all duration-700 hover:scale-[1.05] hover:z-50 hover:border-white/20"
                onClick={() => onCardClick(artifact)}
              >
                {/* Book Cover Background */}
                <div className="absolute inset-0 z-0">
                  {book?.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {/* Cinematic Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 bg-amber-500/20" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end space-y-3">
                  <div className="space-y-1">
                    <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-amber-400">
                      {artifact.type === "podcast-series" ? "Epic Series" : "Archived Voice"}
                    </p>
                    {/* Main title: book title */}
                    <h4 className="font-serif font-bold text-xl leading-tight text-white group-hover:text-amber-400 transition-colors">
                      {book?.title || artifact.title.replace("Series: ", "")}
                    </h4>
                    {/* Secondary: series name */}
                    {book && (
                      <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                        {artifact.title.replace("Series: ", "")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(artifact.createdAt), "MMM d")}
                      </span>
                      {artifact.type === "podcast-series" ? (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {artifact.content?.seasons?.length || 1}S
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {artifact.content?.dialogue?.length || 0}L
                        </span>
                      )}
                    </div>
                    
                    {/* Action Hub */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-destructive/20 hover:text-destructive text-white/60"
                        onClick={(e) => onTrash(e, artifact.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <div className="p-2 rounded-full bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
