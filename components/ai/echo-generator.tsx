"use client";

import { useState, useEffect, useRef } from "react";
import { UserBook, getUserAiArtifacts } from "@/lib/db";
import {
  generateEpisodeScript,
  PODCAST_TONES, type PodcastScript, type PodcastSeries, type Episode,
} from "@/lib/gemini";
import { saveAiArtifact } from "@/lib/db";
import { runFullSeriesGeneration, retryFailedEpisodes } from "@/lib/series-generation";
import { playerStore } from "@/lib/player-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Play, Pause,
  SkipBack, SkipForward, Loader2, ChevronRight,
  AlertCircle, Check, Headphones, Zap, Brain,
  Laugh, Search, Coffee, ArrowLeft, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TONE_ICONS: Record<string, any> = {
  philosophical: Brain, suspense: Zap, witty: Laugh, analytical: Search, casual: Coffee,
};

const STEPS = ["Tone", "Episodes", "Play"];

interface EchoGeneratorProps {
  book: UserBook;
  onClose: () => void;
  initialScript?: PodcastScript;
  initialSeries?: Omit<PodcastSeries, "id" | "bookId" | "createdAt">;
}


// ─── Main Component ───────────────────────────────────────────────────────────
export function EchoGenerator({ book, onClose, initialScript, initialSeries }: EchoGeneratorProps) {
  type Step = "apiKey" | "selectTone" | "selectEpisode" | "generating" | "playing";

  const [step, setStep] = useState<Step>(
    initialScript ? "playing"
      : initialSeries ? "selectEpisode"
      : "selectTone"
  );

  const [selectedTone, setSelectedTone] = useState(PODCAST_TONES[0]);
  const [series, setSeries] = useState<Omit<PodcastSeries, "id" | "bookId" | "createdAt"> | null>(initialSeries || null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [readyEpisodes, setReadyEpisodes] = useState<Set<number>>(new Set());
  const [failedEpisodes, setFailedEpisodes] = useState<Set<number>>(new Set());
  const [script, setScript] = useState<PodcastScript | null>(initialScript || null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingEpisode, setIsGeneratingEpisode] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = typeof window !== "undefined" ? window.speechSynthesis : null;
    return () => synthRef.current?.cancel();
  }, []);

  const displayStep = step === "selectTone" ? 0 : step === "selectEpisode" || step === "generating" ? 1 : step === "playing" ? 2 : -1;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const addReady = (n: number) => setReadyEpisodes(prev => new Set([...prev, n]));
  const addFailed = (n: number) => setFailedEpisodes(prev => new Set([...prev, n]));
  const removeFailed = (n: number) => setFailedEpisodes(prev => { const s = new Set(prev); s.delete(n); return s; });

  const handleSummonKeepers = () => {
    if (series) {
      setStep("selectEpisode");
    } else {
      setStep("selectEpisode");
      runFullSeriesGeneration(
        book, selectedTone,
        // onSeriesOutlineDone: null means re-fetch from DB; if real outline arrives use it
        (outline) => { if (outline) setSeries(outline); },
        (epNum) => { addReady(epNum); removeFailed(epNum); },
        (epNum) => addFailed(epNum)
      );
    }
  };

  const handleRetryFailed = () => {
    if (!series || failedEpisodes.size === 0) return;
    retryFailedEpisodes(
      book, series, failedEpisodes, selectedTone,
      (epNum) => { addReady(epNum); removeFailed(epNum); },
      (epNum) => addFailed(epNum)
    );
  };

  // Change tone: reset series context and go back to tone selection
  const handleChangeTone = () => {
    setSeries(null);
    setReadyEpisodes(new Set());
    setFailedEpisodes(new Set());
    setStep("selectTone");
  };

  const handleGenerateEpisode = async (episode: Episode) => {
    // Fast path: if it's already generated, fetch it and play it immediately
    if (readyEpisodes.has(episode.number)) {
      try {
        const artifacts = await getUserAiArtifacts(book.user_id, "podcast");
        
        // Exact same matching logic as in page.tsx
        const match = artifacts.find(a => 
          a.title === episode.title || 
          a.content?.title === episode.title ||
          (a.title.includes(`Ep ${episode.number}:`) && a.title.includes(selectedTone.label))
        );

        if (match) {
          const loadedScript = match.content as PodcastScript;
          const allEpisodes = (series?.seasons || []).flatMap((s: any) => s.episodes);
          const index = allEpisodes.findIndex((e: any) => e.number === episode.number);
          const normalizedSeries: PodcastSeries = {
            id: "", bookId: book.id, createdAt: "",
            ...series!,
            seasons: series!.seasons || [{ number: 1, title: "Archive Echoes", description: "", episodes: series!.episodes || [] }],
          };

          setScript(loadedScript);
          setStep("playing");
          playerStore.play(loadedScript, book, `${series?.title} · Ep ${episode.number}: ${episode.title}`, normalizedSeries, index);
          return;
        }
      } catch (err) {
        console.warn("Failed to load cached script, falling back to generation.");
      }
    }

    setCurrentEpisode(episode);
    setIsGeneratingEpisode(true);
    setEpisodeError(null);
    setStep("generating");

    try {
      if (!series) throw new Error("Series context lost.");
      const normalizedSeries: PodcastSeries = {
        ...series,
        id: "", bookId: book.id, createdAt: "",
        seasons: series.seasons || [{ number: 1, title: "Archive Echoes", description: "", episodes: series.episodes || [] }],
      };

      const allEpisodes = (series.seasons || []).flatMap((s: any) => s.episodes);
      const index = allEpisodes.findIndex((e: any) => e.number === episode.number);

      const result = await generateEpisodeScript(normalizedSeries, episode, "");
      setScript(result);
      setStep("playing");
      // Also dispatch to global persistent player — survives closing the modal
      playerStore.play(result, book, `${series?.title} · Ep ${episode.number}: ${episode.title}`, normalizedSeries, index);

      await saveAiArtifact(book.user_id, {
        book_id: book.id,
        type: "podcast",
        title: `${series?.title} (${selectedTone.label}) - Ep ${episode.number}: ${episode.title}`,
        // Embed episodeNumber for reliable lookup; _toneId for cascade-delete
        content: { ...result, episodeNumber: episode.number, _toneId: selectedTone.id, _toneLabel: selectedTone.label },
      });
    } catch (err: any) {
      let msg = err.message || "Generation failed.";
      if (msg.includes("503") || msg.toLowerCase().includes("overwhelmed")) msg = "Service busy — please retry.";
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) msg = "Rate limit — wait a moment.";
      setEpisodeError(msg);
      setStep("selectEpisode");
    } finally {
      setIsGeneratingEpisode(false);
    }
  };

  const playLine = (index: number) => {
    if (!synthRef.current || !script) return;
    synthRef.current.cancel();
    const line = script.dialogue[index];
    if (!line) { setIsPlaying(false); return; }
    const utterance = new SpeechSynthesisUtterance(line.text);
    const voices = synthRef.current.getVoices();
    const isA = line.speaker.toLowerCase().includes("a") || line.speaker.toLowerCase().includes("keeper");
    utterance.voice = voices.find(v => isA ? v.name.includes("Male") : v.name.includes("Female")) || voices[0];
    utterance.pitch = isA ? 0.85 : 1.1;
    utterance.rate = 0.93;
    utterance.onend = () => {
      if (index + 1 < script.dialogue.length) { setCurrentLineIndex(index + 1); playLine(index + 1); }
      else { setIsPlaying(false); setCurrentLineIndex(0); }
    };
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) { synthRef.current?.pause(); setIsPlaying(false); }
    else {
      if (synthRef.current?.paused) { synthRef.current.resume(); setIsPlaying(true); }
      else playLine(currentLineIndex);
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full min-h-[550px] flex flex-col">
      {/* Book Hero Banner */}
      <div className="relative rounded-[2rem] overflow-hidden mb-8 flex-shrink-0">
        <div className="h-32 relative">
          {book.coverUrl ? (
            <img src={book.coverUrl} className="absolute inset-0 w-full h-full object-cover blur-sm brightness-30" alt="" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 to-slate-900/80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
          <div className="relative h-full flex items-center gap-5 px-8">
            {book.coverUrl && (
              <div className="w-14 h-20 rounded-xl overflow-hidden shadow-2xl border border-white/20 flex-shrink-0">
                <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400 mb-1">Echo Chronicles</p>
              <h1 className="text-xl font-serif font-bold text-white leading-tight truncate">{book.title}</h1>
              <p className="text-xs text-white/50 font-serif italic truncate">{book.author}</p>
            </div>
            {/* Tone badge (when past tone step) */}
            {displayStep > 0 && (
              <button
                onClick={handleChangeTone}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-[10px] font-bold uppercase tracking-widest"
                title="Change tone"
              >
                {selectedTone.label} ✦
              </button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}
              className="absolute top-3 right-3 rounded-full text-white/40 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      {displayStep >= 0 && (
        <div className="flex items-center justify-center gap-3 mb-8 px-4">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 transition-all duration-500", i <= displayStep ? "opacity-100" : "opacity-30")}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-500",
                  i < displayStep ? "bg-amber-500 border-amber-500 text-black" :
                  i === displayStep ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                  "border-border/40 text-muted-foreground"
                )}>
                  {i < displayStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn("text-[11px] font-bold uppercase tracking-wider hidden sm:block",
                  i === displayStep ? "text-foreground" : "text-muted-foreground"
                )}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("w-8 h-px transition-all duration-700", i < displayStep ? "bg-amber-500" : "bg-border/40")} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">


          {/* Step 1: Tone Selection */}
          {step === "selectTone" && (
            <motion.div key="selectTone"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="max-w-3xl mx-auto space-y-7"
            >
              <div>
                <h2 className="text-2xl font-serif font-bold">Select Resonance Tone</h2>
                <p className="text-sm text-muted-foreground font-serif italic mt-1">
                  Each tone generates a <span className="text-amber-500 font-bold not-italic">separate series</span> — mix and match.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PODCAST_TONES.map((tone) => {
                  const Icon = TONE_ICONS[tone.id] || Mic2;
                  const isSelected = selectedTone.id === tone.id;
                  return (
                    <motion.button key={tone.id} whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedTone(tone)}
                      className={cn(
                        "relative text-left p-6 rounded-[2rem] border-2 transition-all duration-300 overflow-hidden",
                        isSelected ? "border-amber-500 bg-amber-500/5 shadow-xl shadow-amber-500/10"
                          : "border-border/40 bg-card/30 hover:border-amber-500/30 hover:bg-card/50"
                      )}
                    >
                      <div className="space-y-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                          isSelected ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className={cn("font-serif font-bold text-lg mb-1", isSelected && "text-amber-500")}>{tone.label}</h3>
                          <p className="text-sm text-muted-foreground font-serif italic leading-relaxed">{tone.description}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-muted-foreground font-serif italic">
                  Tone: <span className="text-amber-500 font-bold not-italic">{selectedTone.label}</span>
                </p>
                <Button
                  onClick={handleSummonKeepers}
                  className="h-11 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 gap-2 group"
                >
                  <Headphones className="w-4 h-4" />
                  Summon Keepers
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Episode Selection */}
          {step === "selectEpisode" && (
            <motion.div key="selectEpisode"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="max-w-3xl mx-auto space-y-7"
            >
              {episodeError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-serif">{episodeError}</p>
                </div>
              )}

              {/* Series loading state */}
              {!series ? (
                <div className="text-center space-y-6 py-12">
                  <div className="relative mx-auto w-20 h-20">
                    <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full" />
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      className="relative w-20 h-20 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-amber-500 animate-pulse" />
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-lg font-serif font-bold">Architecting your {selectedTone.label} series</p>
                    <p className="text-sm text-muted-foreground font-serif italic mt-1">
                      Runs in the background — you can close this and check back later.
                    </p>
                  </div>
                  <Button variant="outline" onClick={onClose} className="rounded-2xl">
                    Close & Continue Reading
                  </Button>
                </div>
              ) : (
                <>
                  {/* Series Header */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/60 mb-1">
                      {selectedTone.label} · {series.totalSeasons || 1} {(series.totalSeasons || 1) === 1 ? "Season" : "Seasons"}
                    </p>
                    <h2 className="text-2xl font-serif font-bold tracking-tight">{series.title}</h2>
                  </div>

                  {/* Season Tabs */}
                  {series.seasons && series.seasons.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {series.seasons.map((s) => (
                        <button key={s.number}
                          onClick={() => setSelectedSeasonNumber(s.number)}
                          className={cn(
                            "flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-300",
                            selectedSeasonNumber === s.number
                              ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                              : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-amber-500/30"
                          )}
                        >
                          <span className="block text-[9px] uppercase tracking-widest opacity-70">Season {s.number}</span>
                          <span className="block font-serif">{s.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Season Description */}
                  {(() => {
                    const active = series.seasons?.find(s => s.number === selectedSeasonNumber);
                    return active?.description ? (
                      <p className="text-sm text-muted-foreground font-serif italic leading-relaxed border-l-2 border-amber-500/30 pl-4">
                        {active.description}
                      </p>
                    ) : null;
                  })()}

                  {/* Retry All Failed banner */}
                  {failedEpisodes.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        <p className="text-sm font-serif text-destructive">
                          <span className="font-bold">{failedEpisodes.size} episode{failedEpisodes.size === 1 ? "" : "s"}</span> failed to generate.
                        </p>
                      </div>
                      <Button size="sm" onClick={handleRetryFailed}
                        className="flex-shrink-0 h-8 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 text-[10px] font-bold uppercase tracking-widest px-4 transition-all">
                        Retry All
                      </Button>
                    </motion.div>
                  )}

                  {/* Episode List */}
                  <div className="space-y-2">
                    {(series.seasons?.find(s => s.number === selectedSeasonNumber)?.episodes || series.episodes || []).map((episode, idx) => {
                      const isReady = readyEpisodes.has(episode.number);
                      const isBeingGenerated = isGeneratingEpisode && currentEpisode?.number === episode.number;
                      return (
                        <motion.div key={episode.number}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "group flex items-center gap-5 p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                            isBeingGenerated
                              ? "border-amber-500/40 bg-amber-500/5"
                              : "border-border/40 bg-card/20 hover:bg-card/50 hover:border-amber-500/30"
                          )}
                          onClick={() => !isGeneratingEpisode && handleGenerateEpisode(episode)}
                        >
                          <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center">
                            {isBeingGenerated ? (
                              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                            ) : (
                              <>
                                <span className="text-2xl font-bold text-muted-foreground/30 group-hover:hidden font-mono">{episode.number}</span>
                                <div className="hidden group-hover:flex w-11 h-11 rounded-2xl bg-amber-500 items-center justify-center shadow-lg shadow-amber-500/30">
                                  <Play className="w-5 h-5 text-white fill-current" />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-bold leading-tight group-hover:text-amber-500 transition-colors truncate">
                              {episode.title}
                            </h3>
                            <p className="text-xs text-muted-foreground font-serif italic mt-0.5 line-clamp-1">
                              {episode.description}
                            </p>
                          </div>
                          {/* Status badge */}
                          {isBeingGenerated ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex-shrink-0">Recording...</span>
                          ) : isReady ? (
                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                              Ready
                            </span>
                          ) : failedEpisodes.has(episode.number) ? (
                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-[10px] font-bold text-destructive uppercase tracking-widest">
                              Failed
                            </span>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}

              <Button variant="ghost" onClick={() => setStep("selectTone")}
                className="text-muted-foreground hover:text-foreground gap-2 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
                Change Tone
              </Button>
            </motion.div>
          )}

          {/* Generating episode inline (brief flash before moving to playing) */}
          {step === "generating" && (
            <motion.div key="generating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center py-16 space-y-8"
            >
              <div className="relative mx-auto w-24 h-24">
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0.4, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-amber-500/30 blur-3xl rounded-full" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="relative w-24 h-24 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                  <Mic2 className="w-9 h-9 text-amber-500 animate-pulse" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold">Recording Episode {currentEpisode?.number}</h3>
                <p className="text-sm text-muted-foreground font-serif italic mt-1">"{currentEpisode?.title}"</p>
              </div>
              <div className="flex justify-center items-end gap-1 h-10">
                {[...Array(14)].map((_, i) => (
                  <motion.div key={i}
                    animate={{ height: [4, Math.random() * 28 + 8, 4], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9 + i * 0.07, repeat: Infinity, delay: i * 0.06 }}
                    className="w-1.5 rounded-full bg-amber-500/60"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Playing */}
          {step === "playing" && script && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              {/* Now Playing card */}
              <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-amber-500/5 border border-amber-500/20">
                {book.coverUrl && (
                  <div className="w-14 h-18 rounded-xl overflow-hidden flex-shrink-0 shadow-xl border border-white/10">
                    <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/70 mb-1">Now Resonating</p>
                  <h3 className="text-lg font-serif font-bold leading-tight truncate">{script.title}</h3>
                  <p className="text-xs text-muted-foreground font-serif italic truncate">{book.title} · {selectedTone.label}</p>
                </div>
                <div className="flex-shrink-0 flex items-end gap-0.5 h-10">
                  {[...Array(10)].map((_, i) => (
                    <motion.div key={i}
                      animate={{ height: isPlaying ? [3, Math.random() * 28 + 6, 3] : 3, opacity: isPlaying ? [0.4, 1, 0.4] : 0.2 }}
                      transition={{ duration: 0.8 + i * 0.08, repeat: Infinity, delay: i * 0.07 }}
                      className="w-1 rounded-full bg-amber-500"
                    />
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 px-1">
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const idx = Math.floor(((e.clientX - rect.left) / rect.width) * script.dialogue.length);
                    setCurrentLineIndex(idx);
                    if (isPlaying) playLine(idx);
                  }}>
                  <motion.div className="h-full bg-amber-500 rounded-full"
                    animate={{ width: `${(currentLineIndex / script.dialogue.length) * 100}%` }}
                    transition={{ duration: 0.3 }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Line {currentLineIndex + 1}</span>
                  <span>{script.dialogue.length} total</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => { const p = Math.max(0, currentLineIndex - 1); setCurrentLineIndex(p); if (isPlaying) playLine(p); }}
                  className="w-11 h-11 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
                <button onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <button onClick={() => { const n = Math.min(script.dialogue.length - 1, currentLineIndex + 1); setCurrentLineIndex(n); if (isPlaying) playLine(n); }}
                  className="w-11 h-11 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all">
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Transcript */}
              <div className="h-[280px] overflow-y-auto space-y-2 pr-2 no-scrollbar">
                {script.dialogue.map((line, i) => {
                  const isA = line.speaker.toLowerCase().includes("a") || line.speaker.toLowerCase().includes("keeper");
                  return (
                    <motion.div key={i}
                      animate={{ opacity: i === currentLineIndex ? 1 : 0.35, scale: i === currentLineIndex ? 1 : 0.99 }}
                      transition={{ duration: 0.4 }}
                      onClick={() => { setCurrentLineIndex(i); if (isPlaying) playLine(i); }}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300",
                        i === currentLineIndex ? "bg-amber-500/8 border border-amber-500/25" : "border border-transparent hover:border-border/40 hover:bg-card/30"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0", isA ? "bg-amber-500" : "bg-blue-400")} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{line.speaker}</p>
                        <p className={cn("text-sm font-serif leading-relaxed italic",
                          line.text.startsWith("*[") ? "text-amber-500/60 not-italic text-[11px]" : "text-foreground/90"
                        )}>{line.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                {series ? (
                  <Button variant="ghost" onClick={() => setStep("selectEpisode")} className="rounded-xl gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Back to Episodes
                  </Button>
                ) : <div />}
                <Button variant="ghost" onClick={onClose} className="rounded-xl text-muted-foreground hover:text-foreground">
                  Close Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
