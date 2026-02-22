"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Sparkles, Layers, Calendar, Mic2, BookOpen, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiArtifact, UserBook, getUserAiArtifacts } from "@/lib/db";
import { Episode, Season, PODCAST_TONES } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { generationStore } from "@/lib/generation-store";


interface ResonanceDetailProps {
  userId: string | null;
  artifact: AiArtifact;
  book: UserBook | null;
  onClose: () => void;
  onPlayEpisode: (episode: Episode, season: Season, actualArtifact?: AiArtifact) => void;
  onGenerateTone: (toneId: string) => void;
}

export function ResonanceDetail({ 
  userId, artifact, book, onClose, onPlayEpisode, onGenerateTone 
}: ResonanceDetailProps) {
  const [allSeries, setAllSeries] = useState<AiArtifact[]>([artifact]);
  const initialTone = (artifact.content as any)._toneId || 
    PODCAST_TONES.find(t => t.label === (artifact.content as any).tone)?.id || 
    "philosophical";

  const [selectedToneId, setSelectedToneId] = useState(initialTone);
  const [selectedSeason, setSelectedSeason] = useState(1);
  // Initialised synchronously from the store so the first render is correct
  // (avoids the Generate → Loading flicker on modal reopen)
  const [isGenerating, setIsGenerating] = useState(() => {
    const bookTitle = book?.title;
    if (!bookTitle) return false;
    return generationStore.getAll().some(
      j => j.bookTitle === bookTitle && j.status !== "done" && j.status !== "error"
    );
  });

  const loadAllSeries = () => {
    if (userId && book?.id) {
      getUserAiArtifacts(userId, "podcast-series")
        .then(res => setAllSeries(res.filter(a => a.book_id === book.id)));
    }
  };

  useEffect(() => {
    loadAllSeries();
  }, [userId, book?.id]);

  // Subscribe to generationStore to know if a tone for THIS book is in progress
  useEffect(() => {
    const unsub = generationStore.subscribe(jobs => {
      const bookTitle = book?.title;
      if (!bookTitle) return;

      const prevGenerating = isGenerating;
      const activeJobForBook = jobs.find(
        j => j.bookTitle === bookTitle && j.status !== "done" && j.status !== "error"
      );
      const nowGenerating = !!activeJobForBook;
      setIsGenerating(nowGenerating);

      // When a job finishes, refresh allSeries to pick up the new tone immediately
      if (prevGenerating && !nowGenerating) {
        loadAllSeries();
      }
    });
    return () => { unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.title]);

  const activeArtifact = allSeries.find(a => 
    (a.content as any)._toneId === selectedToneId || 
    ((a.content as any).tone && PODCAST_TONES.find(t => t.label === (a.content as any).tone)?.id === selectedToneId)
  );

  const isSeries = activeArtifact?.type === "podcast-series";
  const content = activeArtifact?.content as any;
  
  const seasons: Season[] = content?.seasons || 
    (content?.episodes ? [{ number: 1, title: "Archive Echoes", description: "", episodes: content.episodes }] : []);
  
  const activeSeason = seasons.find(s => s.number === selectedSeason) || seasons[0];
  const missingToneMeta = PODCAST_TONES.find(t => t.id === selectedToneId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative min-h-screen max-w-5xl mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero Section — Book Cover + Gradient */}
        <div className="relative h-[55vh] min-h-[400px] overflow-hidden rounded-b-[3rem]">
          {book?.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm brightness-50"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          )}
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-6 right-6 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white border border-white/20 z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-10 space-y-6">
            {/* Book & Series Info */}
            <div className="flex items-start gap-8">
              {book?.coverUrl && (
                <div className="hidden sm:block flex-shrink-0 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-4">
                {/* Book title is the MAIN title */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400 mb-2 flex items-center gap-2">
                    <BookOpen className="w-3 h-3" />
                    {book?.author || "Unknown Author"} · Echo Series
                  </p>
                  <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white leading-tight tracking-tight">
                    {book?.title || artifact.title}
                  </h1>
                  {isSeries && content?.title && content.title !== book?.title && (
                    <p className="text-lg text-white/60 font-serif italic mt-1">{content.title}</p>
                  )}
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                    {isSeries ? "Epic Series" : "Episode"}
                  </span>
                  {isSeries && (
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {seasons.length} Seasons
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(activeArtifact?.createdAt || artifact.createdAt), "MMM yyyy")}
                  </span>
                  {activeArtifact && content?.tone && (
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Mic2 className="w-3 h-3" />
                      {content.tone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-[#111] min-h-[45vh] p-8 sm:p-10 space-y-10 rounded-t-none">
          
          {/* Tone Selector */}
          {book && (
            <div className="space-y-4 border-b border-white/10 pb-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Resonance Tone</h2>
              <div className="flex flex-wrap gap-2">
                {PODCAST_TONES.map(tone => {
                  const exists = allSeries.some(a => 
                    (a.content as any)._toneId === tone.id || 
                    ((a.content as any).tone && PODCAST_TONES.find(t => t.label === (a.content as any).tone)?.id === tone.id)
                  );
                  return (
                    <button
                      key={tone.id}
                      onClick={() => { setSelectedToneId(tone.id); setSelectedSeason(1); }}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold font-serif transition-colors border",
                        selectedToneId === tone.id 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10",
                        !exists && selectedToneId !== tone.id && "opacity-50 hover:opacity-100"
                      )}
                    >
                      {tone.label} {exists && "✨"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic State: Generated vs Not Generated */}
          {!activeArtifact ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                <Wand2 className="w-8 h-8 text-white/30" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl font-serif font-bold text-white">Unlock the {missingToneMeta?.label} Echo</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  This tone hasn't been generated for {book?.title}. {missingToneMeta?.description}
                </p>
              </div>
              
              {(() => {
                  const hasLocalSeriesForTone = allSeries.some(a => 
                    (a.content as any)._toneId === selectedToneId || 
                    ((a.content as any).tone && PODCAST_TONES.find(t => t.label === (a.content as any).tone)?.id === selectedToneId)
                  );
                  if (hasLocalSeriesForTone) {
                      return (
                          <div className="px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-sm font-bold tracking-wider uppercase">
                              <Sparkles className="w-4 h-4 inline-block mr-2" />
                              Already Synthesized
                          </div>
                      );
                  }
                  return (
                      <Button 
                        onClick={() => {
                          setIsGenerating(true);
                          onGenerateTone(selectedToneId);
                        }}
                        disabled={isGenerating}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 shadow-lg shadow-amber-500/20 px-8 rounded-full"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isGenerating ? "Synthesizing Echoes..." : `Generate ${missingToneMeta?.label} Chronicles`}
                      </Button>
                  );
              })()}
            </div>
          ) : (
            <>
              {/* Overview */}
              {isSeries ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Overview</h2>
                <p className="text-white/80 text-base font-serif italic leading-relaxed">
                  A multi-season podcast resonance distilled from <span className="text-amber-400 not-italic font-bold">{book?.title || "this volume"}</span> by {book?.author}. 
                  {seasons.length > 1 
                    ? ` Spanning ${seasons.length} seasons, each exploring distinct thematic arcs of the source material.`
                    : ` Exploring the key themes and narratives within.`
                  }
                </p>
              </div>

              {/* Season Tabs */}
              {seasons.length > 1 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Seasons</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {seasons.map(season => (
                      <button
                        key={season.number}
                        onClick={() => setSelectedSeason(season.number)}
                        className={cn(
                          "flex-shrink-0 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 border text-left space-y-1",
                          selectedSeason === season.number
                            ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/30"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="text-[9px] uppercase tracking-widest opacity-70">Season {season.number}</div>
                        <div className="font-serif">{season.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Season Description */}
              {activeSeason?.description && (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white/70 font-serif italic leading-relaxed">{activeSeason.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Episode Overview</h2>
              <p className="text-white/80 text-base font-serif italic leading-relaxed">
                A podcast episode distilled from <span className="text-amber-400 not-italic font-bold">{book?.title}</span> in the <span className="text-white/60">{content?.tone || "philosophical"}</span> tone.
              </p>
            </div>
          )}

          {/* Episode List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                {isSeries ? `${activeSeason?.title || "Episodes"} — Episode List` : "Dialogue & Script"}
              </h2>
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                {isSeries ? `${activeSeason?.episodes?.length || 0} Episodes` : `${content?.dialogue?.length || 0} Lines`}
              </span>
            </div>

            {isSeries && activeSeason ? (
              <div className="space-y-2">
                {activeSeason.episodes.map((episode, idx) => (
                  <EpisodeRow
                    key={episode.id || idx}
                    episode={episode}
                    season={activeSeason}
                    index={idx}
                    onPlay={(ep, sea) => onPlayEpisode(ep, sea, activeArtifact)}
                  />
                ))}
              </div>
            ) : (
              // Single episode: show dialogue preview
              <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pr-2">
                {content?.dialogue?.slice(0, 6).map((line: any, i: number) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      line.speaker?.toLowerCase().includes("a") ? "bg-amber-500" : "bg-blue-400"
                    )} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{line.speaker}</p>
                      <p className="text-sm text-white/70 font-serif italic leading-relaxed line-clamp-2">{line.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}

          {/* Bottom padding for Spotify player */}
          <div className="h-24" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function EpisodeRow({ 
  episode, season, index, onPlay
}: { 
  episode: Episode; 
  season: Season;
  index: number; 
  onPlay: (e: Episode, s: Season) => void; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-center gap-5 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all duration-300"
      onClick={() => onPlay(episode, season)}
    >
      {/* Episode Number → Play on hover */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
        <span className="text-xl font-bold text-white/20 group-hover:hidden font-mono">{episode.number}</span>
        <div className="hidden group-hover:flex w-10 h-10 rounded-full bg-amber-500 items-center justify-center shadow-lg shadow-amber-500/30">
          <Play className="w-4 h-4 text-black fill-current" />
        </div>
      </div>

      {/* Episode info */}
      <div className="flex-1 space-y-0.5 min-w-0">
        <h4 className="font-serif font-bold text-white/90 text-sm leading-tight truncate group-hover:text-amber-400 transition-colors">
          {episode.title}
        </h4>
        <p className="text-xs text-white/40 font-serif italic line-clamp-1 leading-relaxed">
          {episode.description}
        </p>
      </div>
    </motion.div>
  );
}
