"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { 
  Mic2, Sparkles, BookOpen, Wand2, ChevronRight, Headphones, 
  Zap, Globe, Lock, TrendingUp, Play, LayoutGrid, Radio, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ResonanceArchives } from "@/components/ai/resonance-archives";
import { ResonanceDetail } from "@/components/ai/resonance-detail";
import { supabase } from "@/lib/supabase";
import { AiArtifact, getUserBooks, getUserAiArtifacts, saveAiArtifact, UserBook } from "@/lib/db";
import { generateEpisodeScript, PodcastScript, PodcastSeries, Episode, Season, PODCAST_TONES } from "@/lib/gemini";
import { playerStore } from "@/lib/player-store";
import { runFullSeriesGeneration } from "@/lib/series-generation";
import { generationStore } from "@/lib/generation-store";
import { toast } from "sonner";

// ── Feature registry ─────────────────────────────────────────────────────────

const features = [
  {
    id: "echo-chronicles",
    title: "Echo Chronicles",
    tagline: "Books as podcasts",
    desc: "Your library transforms into a multi-season cinematic podcast. Two AI Keepers analyse themes, plot, and the spiritual essence of your volumes in your chosen tone.",
    icon: Mic2,
    status: "Active" as const,
    href: "/ai-lab/echo-chronicles",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.08)",
    colorBorder: "rgba(245,158,11,0.2)",
    stats: [
      { label: "Tones", value: PODCAST_TONES.length.toString() },
      { label: "Voices", value: "2 AI" },
      { label: "Depth", value: "Multi-Season" },
    ],
  },
  {
    id: "lexicon",
    title: "Lexicon Prime",
    tagline: "Deep textual analysis",
    desc: "Contextual intelligence for archaic terms, historical references, and obscure allusions concealed within your library's rarest volumes.",
    icon: BookOpen,
    status: "Upcoming" as const,
    href: "#",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.08)",
    colorBorder: "rgba(99,102,241,0.2)",
    stats: [
      { label: "Languages", value: "20+" },
      { label: "Eras", value: "All" },
      { label: "Status", value: "Q2 '25" },
    ],
  },
  {
    id: "visual-res",
    title: "Visual Resonance",
    tagline: "Passages as art",
    desc: "Generative charcoal and ink illustrations drawn from the most evocative passages of your literary collection. Art from words.",
    icon: Wand2,
    status: "Upcoming" as const,
    href: "#",
    color: "#10b981",
    colorBg: "rgba(16,185,129,0.08)",
    colorBorder: "rgba(16,185,129,0.2)",
    stats: [
      { label: "Styles", value: "8" },
      { label: "Format", value: "HD" },
      { label: "Status", value: "Q3 '25" },
    ],
  },
];

// ── Floating Particle Background ─────────────────────────────────────────────

function Orbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[50%] h-[40%] bg-primary/5 blur-[160px] rounded-full"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-[10%] right-[-8%] w-[40%] h-[35%] bg-amber-500/5 blur-[140px] rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute top-[35%] right-[10%] w-[30%] h-[25%] bg-indigo-500/6 blur-[120px] rounded-full"
      />
    </div>
  );
}

// ── Premium Feature Card ──────────────────────────────────────────────────────

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const isActive = feature.status === "Active";
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [4, -4]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-4, 4]), { stiffness: 300, damping: 30 });
  const glowX = useTransform(mouseX, [-150, 150], ["0%", "100%"]);
  const glowY = useTransform(mouseY, [-150, 150], ["0%", "100%"]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.12, type: "spring", stiffness: 200, damping: 20 }}
      style={{ perspective: 800 }}
    >
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-[2rem] border transition-all duration-500",
            "bg-card/40 backdrop-blur-xl shadow-2xl group",
            isActive ? "hover:shadow-[0_0_60px_rgba(245,158,11,0.08)]" : "opacity-70"
          )}
          style={{ borderColor: feature.colorBorder }}
        >
          {/* Gradient glow that follows mouse */}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at ${glowX} ${glowY}, ${feature.color}12, transparent 60%)`,
            }}
          />

          {/* Top gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-b opacity-60"
            style={{
              background: `linear-gradient(135deg, ${feature.colorBg} 0%, transparent 60%)`,
            }}
          />

          <div className="relative p-8 flex flex-col h-full space-y-6">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div
                className="p-3.5 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl"
                style={{ background: feature.colorBg, borderColor: feature.colorBorder }}
              >
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border",
                    isActive
                      ? "text-amber-400 bg-amber-400/10 border-amber-400/30 animate-pulse"
                      : "text-muted-foreground/50 bg-muted/20 border-border/30"
                  )}
                >
                  {isActive ? "● Live" : feature.status}
                </span>
              </div>
            </div>

            {/* Title & desc */}
            <div className="space-y-2 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
                {feature.tagline}
              </p>
              <h2 className="font-serif text-2xl font-bold tracking-tight leading-tight">
                {feature.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-serif italic mt-3">
                {feature.desc}
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex gap-4 pt-2 border-t border-border/20">
              {feature.stats.map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-mono">{stat.label}</p>
                  <p className="text-sm font-bold" style={{ color: feature.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div>
              {isActive ? (
                <Link href={feature.href}>
                  <Button
                    className="w-full h-12 justify-between px-6 rounded-2xl font-bold transition-all duration-300 border"
                    style={{
                      background: feature.colorBg,
                      borderColor: feature.colorBorder,
                      color: feature.color,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Launch Feature
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <div className="w-full h-12 flex items-center justify-center rounded-2xl border border-dashed border-border/30 text-muted-foreground/30 text-xs font-bold uppercase tracking-widest">
                  Coming Soon
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Token efficiency badge ────────────────────────────────────────────────────

function EfficiencyBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
    >
      <Zap className="w-3.5 h-3.5" />
      <span className="text-[11px] font-bold uppercase tracking-widest">Smart Archive — Zero Redundant Generation</span>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResonanceLab() {
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<UserBook[]>([]);
  const [detailArtifact, setDetailArtifact] = useState<AiArtifact | null>(null);
  const [detailBook, setDetailBook] = useState<UserBook | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        getUserBooks(data.user.id).then(setBooks);
      }
    });
  }, []);

  const getBookForArtifact = (artifact: AiArtifact): UserBook | null =>
    artifact.book_id ? books.find(b => b.id === artifact.book_id) ?? null : null;

  const handleOpenDetail = (artifact: AiArtifact) => {
    setDetailArtifact(artifact);
    setDetailBook(getBookForArtifact(artifact));
  };

  const handlePlaySingleArtifact = (artifact: AiArtifact) => {
    if (artifact.type === "podcast") {
      playerStore.play(artifact.content as PodcastScript, getBookForArtifact(artifact), artifact.title);
    } else {
      handleOpenDetail(artifact);
    }
  };

  const handlePlayEpisodeFromDetail = (episode: Episode, _season: Season, actualArtifact?: AiArtifact) => {
    if (!userId || !detailBook) return;
    const targetArtifact = actualArtifact || detailArtifact;
    if (!targetArtifact) return;

    const sc = targetArtifact.content as any;
    const allEpisodes = (sc.seasons || []).flatMap((s: any) => s.episodes);
    const index = allEpisodes.findIndex((e: any) => e.number === episode.number);

    const normalizedSeries: PodcastSeries = {
      id: targetArtifact.id,
      bookId: detailBook.id,
      createdAt: targetArtifact.createdAt,
      title: sc.title || detailBook.title,
      tone: sc.tone || "philosophical",
      totalSeasons: sc.totalSeasons || 1,
      seasons: sc.seasons || [{ number: 1, title: "Archive Echoes", description: "", episodes: sc.episodes || [] }],
      episodes: sc.episodes,
    };

    if (episode.script) {
      playerStore.play(episode.script, detailBook, episode.title, normalizedSeries, index);
      return;
    }

    getUserAiArtifacts(userId, "podcast").then(artifacts => {
      const match = artifacts.find(a =>
        a.book_id === detailBook.id && (
          // Try episodeNumber field, fall back to title match
          a.content?.episodeNumber === episode.number ||
          (a.content as any)?.number === episode.number ||
          a.title === episode.title
        )
      );

      if (match) {
        playerStore.play(match.content as PodcastScript, detailBook, episode.title, normalizedSeries, index);
      } else {
        handleGenerateEpisodeFromDetail(episode, _season);
      }
    });
  };

  const handleGenerateEpisodeFromDetail = async (episode: Episode, season: Season) => {
    if (!userId || !detailArtifact || !detailBook) return;
    playerStore.setGenerating(detailBook, episode.title);

    try {
      const sc = detailArtifact.content as any;
      const allEpisodes = (sc.seasons || []).flatMap((s: any) => s.episodes);
      const index = allEpisodes.findIndex((e: any) => e.number === episode.number);

      const normalizedSeries: PodcastSeries = {
        id: detailArtifact.id, bookId: detailBook.id, createdAt: detailArtifact.createdAt,
        title: sc.title || detailBook.title, tone: sc.tone || "philosophical",
        totalSeasons: sc.totalSeasons || 1,
        seasons: sc.seasons || [{ number: 1, title: "Archive Echoes", description: "", episodes: sc.episodes || [] }],
        episodes: sc.episodes,
      };

      playerStore.setGenerating(detailBook, episode.title, normalizedSeries, index);

      const scriptResult = await generateEpisodeScript(normalizedSeries,
        { ...episode, id: `ep-${episode.number}` }, "");
      await saveAiArtifact(userId, {
        book_id: detailBook.id,
        type: "podcast",
        // Use same title format as all other save paths for consistent lookup
        title: `${normalizedSeries.title} (${normalizedSeries.tone}) - Ep ${episode.number}: ${episode.title}`,
        content: {
          ...scriptResult,
          episodeNumber: episode.number,
          _toneId: PODCAST_TONES.find(t => t.label === normalizedSeries.tone || t.id === normalizedSeries.tone)?.id,
          _toneLabel: normalizedSeries.tone,
        },
      });

      playerStore.play(scriptResult, detailBook, episode.title, normalizedSeries, index);
      toast.success(`"${episode.title}" is ready to play!`);
    } catch (err: any) {
      toast.error("Generation failed: " + (err.message || "Unknown error"));
      playerStore.close();
    }
  };

  const handleGenerateNewTone = (toneId: string) => {
    if (!userId || !detailBook) return;
    const toneTarget = PODCAST_TONES.find(t => t.id === toneId);
    if (!toneTarget) return;

    // Guard: don't spawn a second job if one is already active for this book
    const alreadyRunning = generationStore.getAll().some(
      j => j.bookTitle === detailBook.title && j.status !== "done" && j.status !== "error"
    );
    if (alreadyRunning) {
      toast.info(`Already generating for "${detailBook.title}" — please wait.`);
      return;
    }

    toast.info(`Initialising resonance extraction for ${detailBook.title}...`);
    // Pass undefined for onSeriesOutlineDone — the ResonanceDetail modal stays open
    // and its own generationStore subscription handles the data refresh when done.
    runFullSeriesGeneration(detailBook, toneTarget);
  };

  return (
    <div className="relative min-h-screen pb-40">
      <Orbs />

      <div className="max-w-6xl mx-auto px-6 space-y-28 pt-16">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="text-center space-y-8 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Animated badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Intelligence Layer · Active
            </motion.div>

            {/* Icon */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
              />
              <div className="relative p-5 rounded-[2rem] bg-primary/10 border border-primary/20 shadow-2xl">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="font-serif text-6xl md:text-7xl font-bold tracking-tight leading-none">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/30">
                  The Resonance
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 animate-gradient">
                  Lab
                </span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-lg font-serif italic leading-relaxed max-w-xl mx-auto"
              >
                Where ancient archives meet the echoes of future intelligence.
                Enhance your reading experience through curated AI augmentation.
              </motion.p>
            </div>
          </motion.div>

          {/* Efficiency badge */}
          <EfficiencyBadge />

          {/* Stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            {[
              { icon: Globe, label: "Global Resonance Sharing" },
              { icon: Zap, label: "Parallel Episode Generation" },
              { icon: Lock, label: "Your Data, Secured" },
              { icon: Star, label: `${PODCAST_TONES.length} Distinct Tones` },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-serif text-xs">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── FEATURE CARDS ────────────────────────────────────────────────── */}
        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/50 font-mono">
              Intelligence Modules
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.id} feature={f} index={i} />
            ))}
          </div>
        </section>

        {/* ── RESONANCE ARCHIVES ───────────────────────────────────────────── */}
        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/50 font-mono">
                Your Archive
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-serif text-3xl font-bold tracking-tight">Resonance Archives</h2>
                <p className="text-sm text-muted-foreground font-serif italic mt-1">
                  Series blueprints and standalone echoes — click any to explore or play.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground/60">
                <LayoutGrid className="w-4 h-4" />
                <span className="font-mono uppercase tracking-widest text-[10px]">Grid View</span>
              </div>
            </div>
          </motion.div>

          {userId ? (
            <ResonanceArchives
              userId={userId}
              onReplay={handlePlaySingleArtifact}
              onOpenDetail={handleOpenDetail}
            />
          ) : (
            <div className="animate-pulse h-64 bg-muted/10 rounded-[3rem] border border-border/20 border-dashed" />
          )}
        </section>
      </div>

      {/* ── DETAIL VIEW ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailArtifact && (
          <ResonanceDetail
            userId={userId}
            artifact={detailArtifact}
            book={detailBook}
            onClose={() => { setDetailArtifact(null); setDetailBook(null); }}
            onPlayEpisode={handlePlayEpisodeFromDetail}
            onGenerateTone={handleGenerateNewTone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
