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
  Clock, Layers, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { generationStore, type GenerationJob } from "@/lib/generation-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [pendingTrash, setPendingTrash] = useState<AiArtifact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);

  const seriesArtifacts = artifacts.filter(a => a.type === "podcast-series");
  
  // A standalone episode is one that does not start with the title of ANY existing series for the same book
  const standaloneEpisodes = artifacts.filter(a => {
    if (a.type !== "podcast") return false;
    
    // Check if it belongs to any of our known series for this book
    const possibleParents = seriesArtifacts.filter(s => s.book_id === a.book_id);
    const isChild = possibleParents.some(s => {
       const sc = s.content as any;
       const toneLabel = sc?.tone || "philosophical";
       // If the episode title matches the series title, or the tone, it belongs to the series container
       return a.title.includes(sc?.title) || a.title.includes(toneLabel) || (a.content as any)?.tone === toneLabel;
    });
    
    return !isChild;
  });

  const unified = [
    ...artifacts.filter(a => a.type === "podcast-series"),
    ...standaloneEpisodes,
  ];

  useEffect(() => { 
    loadData(); 

    let prevJobsCount = 0;
    const unsub = generationStore.subscribe((jobs) => {
       const active = jobs.filter(j => j.status !== "done" && j.status !== "error");
       setActiveJobs(active);
       
       // If a job finished, refresh the archives to fetch the new artifact
       if (active.length < prevJobsCount) {
         loadData();
       }
       prevJobsCount = active.length;
    });

    const currActive = generationStore.getAll().filter(j => j.status !== "done" && j.status !== "error");
    setActiveJobs(currActive);
    prevJobsCount = currActive.length;

    return () => { unsub(); };
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [artifactData, bookData] = await Promise.all([
        getUserAiArtifacts(userId),
        getUserBooks(userId),
      ]);
      setArtifacts(artifactData);
      setBooks(bookData);
    } catch {
      toast.error("Failed to load archive data.");
    } finally {
      setIsLoading(false);
    }
  };

  const getBookForArtifact = (bookId: string | null): UserBook | null =>
    bookId ? books.find(b => b.id === bookId) ?? null : null;

  const handleTrashClick = (artifact: AiArtifact) => setPendingTrash(artifact);

  const handleConfirmTrash = async () => {
    if (!pendingTrash) return;
    setIsDeleting(true);
    try {
      if (pendingTrash.type === "podcast-series") {
        // Find all child episodes of this series
        const childEpisodes = artifacts.filter(a => a.type === "podcast" && a.book_id === pendingTrash.book_id);
        
        // Trash the series and all its episodes
        await Promise.all([
          trashAiArtifact(userId, pendingTrash.id),
          ...childEpisodes.map(ep => trashAiArtifact(userId, ep.id))
        ]);
        
        // Remove both series and child episodes from UI
        setArtifacts(prev => prev.filter(a => a.id !== pendingTrash.id && !childEpisodes.some(ep => ep.id === a.id)));
      } else {
        await trashAiArtifact(userId, pendingTrash.id);
        setArtifacts(prev => prev.filter(a => a.id !== pendingTrash.id));
      }
      toast.success("Resonance moved to recovery archives.");
      setPendingTrash(null);
    } catch {
      toast.error("Failed to discard resonance.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-7 w-48 bg-muted/20 animate-pulse rounded-full" />
        <div className="flex gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-[240px] rounded-[1.75rem] bg-muted/10 animate-pulse" style={{ height: 360 }} />
          ))}
        </div>
      </div>
    );
  }

  if (unified.length === 0 && activeJobs.length === 0) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Mic2 className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold tracking-tight">Resonance Archives</h2>
          <p className="text-xs text-muted-foreground font-serif italic">
            Series blueprints and standalone echoes — click any to explore or play.
          </p>
        </div>
      </div>

      {/* Archive Row */}
      <ArchiveRow
        artifacts={unified}
        activeJobs={activeJobs}
        getBook={getBookForArtifact}
        onCardClick={(a) => a.type === "podcast-series" ? (onOpenDetail || onReplay)(a) : onReplay(a)}
        onTrashClick={handleTrashClick}
      />

      {/* Confirm discard dialog */}
      <ConfirmDialog
        open={!!pendingTrash}
        onClose={() => setPendingTrash(null)}
        onConfirm={handleConfirmTrash}
        isLoading={isDeleting}
        title="Discard Resonance?"
        description={`"${pendingTrash?.title}" will be moved to your recovery archives. You can restore it anytime from Settings.`}
        confirmLabel="Discard"
        variant="danger"
      />
    </div>
  );
}

/* ── Archive horizontal scroller ─────────────────────────────────── */

interface ArchiveRowProps {
  artifacts: AiArtifact[];
  activeJobs?: GenerationJob[];
  getBook: (id: string | null) => UserBook | null;
  onCardClick: (a: AiArtifact) => void;
  onTrashClick: (a: AiArtifact) => void;
}

function ArchiveRow({ artifacts, activeJobs = [], getBook, onCardClick, onTrashClick }: ArchiveRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    scrollRef.current.scrollTo({
      left: dir === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/row">
      {/* Scroll arrows */}
      <button onClick={() => scroll("left")}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-border/40 shadow-lg flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-muted/50">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => scroll("right")}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-border/40 shadow-lg flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-muted/50">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scroll container */}
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 no-scrollbar"
        style={{ scrollbarWidth: "none" }}>
        
        {/* ── Active Generation Jobs ── */}
        {activeJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0 w-[220px]"
            >
              <div className="group/card relative rounded-2xl overflow-hidden bg-card border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] pointer-events-none">
                 {/* Cover Art */}
                 <div className="relative aspect-[3/4] overflow-hidden">
                    {job.bookCover ? (
                      <img src={job.bookCover} className="absolute inset-0 w-full h-full object-cover blur-sm brightness-50" alt="" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-card to-card/80 flex items-center justify-center">
                        <Mic2 className="w-14 h-14 text-amber-500/25" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {/* Status badge */}
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full backdrop-blur-sm bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                       <Loader2 className="w-3 h-3 animate-spin" />
                       Generating
                    </span>

                    {/* Progress Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20">
                       <div className="relative w-12 h-12 mb-4">
                          <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-amber-500/40 blur-xl rounded-full" />
                          <div className="relative w-full h-full rounded-full border-2 border-dashed border-amber-500/50 flex items-center justify-center animate-[spin_4s_linear_infinite]">
                             <Mic2 className="w-5 h-5 text-amber-500 animate-[spin_4s_linear_infinite_reverse]" />
                          </div>
                       </div>
                       <p className="text-[11px] font-bold text-white uppercase tracking-[0.15em] mb-1.5 drop-shadow-md">
                         {job.status === "extracting" || job.status === "planning" ? "Architecting..." : "Recording..."}
                       </p>
                       <p className="text-[10px] text-amber-200/90 font-serif italic line-clamp-2 leading-tight px-2">
                         {job.label}
                       </p>
                    </div>
                 </div>
                 
                 {/* Info Footer */}
                 <div className="p-3.5 space-y-2 opacity-60 bg-gradient-to-b from-transparent to-black/40">
                    <div>
                       <p className="font-serif font-bold text-[13px] leading-tight line-clamp-2 text-white">
                         {job.bookTitle}
                       </p>
                       <p className="text-[10px] text-amber-500/80 uppercase tracking-widest mt-0.5 truncate font-mono">
                         {job.tone} Series
                       </p>
                    </div>
                 </div>
              </div>
            </motion.div>
        ))}

        {/* ── Completed Artifacts ── */}
        {artifacts.map((artifact, i) => {
          const book = getBook(artifact.book_id);
          const isSeries = artifact.type === "podcast-series";
          return (
            <motion.div
              key={artifact.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 20 }}
              className="flex-shrink-0 w-[220px]"
            >
              <div className="group/card relative rounded-2xl overflow-hidden bg-card border border-border/30 shadow-lg hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-400">
                {/* ── Cover Art ── */}
                <div className="relative aspect-[3/4] cursor-pointer overflow-hidden" onClick={() => onCardClick(artifact)}>
                  {book?.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700"
                      alt=""
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-card to-card/80 flex items-center justify-center">
                      <Mic2 className="w-14 h-14 text-amber-500/25" />
                    </div>
                  )}
                  {/* dark gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Type badge — top-left */}
                  <span className={cn(
                    "absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full backdrop-blur-sm",
                    isSeries
                      ? "bg-amber-500/30 text-amber-300 border border-amber-400/30"
                      : "bg-blue-500/30 text-blue-300 border border-blue-400/30"
                  )}>
                    {isSeries ? "Series" : "Episode"}
                  </span>

                  {/* ── Trash button — top-right, ALWAYS VISIBLE ── */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onTrashClick(artifact); }}
                    className={cn(
                      "absolute top-2.5 right-2.5 z-20",
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "bg-black/50 border border-white/20 backdrop-blur-sm",
                      "text-white/80 hover:bg-red-500 hover:text-white hover:border-red-400/60",
                      "hover:scale-110 active:scale-95",
                      "transition-all duration-200 shadow-lg"
                    )}
                    aria-label="Discard resonance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-amber-500/90 flex items-center justify-center shadow-xl shadow-amber-500/30">
                      <Play className="w-5 h-5 fill-current text-black ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* ── Info Footer ── */}
                <div className="p-3.5 space-y-2 cursor-pointer" onClick={() => onCardClick(artifact)}>
                  <div>
                    <p className="font-serif font-bold text-[13px] leading-tight line-clamp-2">
                      {book?.title || artifact.title.replace("Series: ", "")}
                    </p>
                    {book && (
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-0.5 truncate font-mono">
                        {artifact.title.replace("Series: ", "")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(artifact.createdAt), "MMM d")}
                    </span>
                    {isSeries ? (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {artifact.content?.seasons?.length || 1} Season{(artifact.content?.seasons?.length || 1) > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {artifact.content?.dialogue?.length || 0} Lines
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
