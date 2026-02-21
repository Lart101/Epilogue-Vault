"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, Sparkles, BookOpen, Wand2, ChevronRight, Headphones, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ResonanceArchives } from "@/components/ai/resonance-archives";
import { ResonanceDetail } from "@/components/ai/resonance-detail";
import { supabase } from "@/lib/supabase";
import { AiArtifact, getUserBooks, getUserAiArtifacts, saveAiArtifact, UserBook } from "@/lib/db";
import { generateEpisodeScript, PodcastScript, PodcastSeries, Episode, Season } from "@/lib/gemini";
import { playerStore } from "@/lib/player-store";
import { toast } from "sonner";

const features = [
  {
    id: "echo-chronicles",
    title: "Echo Chronicles",
    desc: "Transform your archives into a cinematic podcast. Two AI Keepers discuss themes, plot, and the essence of your volume.",
    icon: Mic2,
    status: "Active",
    href: "/ai-lab/echo-chronicles",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    glow: "group-hover:shadow-amber-500/10",
  },
  {
    id: "lexicon",
    title: "Lexicon Prime",
    desc: "Deep contextual analysis of archaic terms and historical references within your library.",
    icon: BookOpen,
    status: "Upcoming",
    href: "#",
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
  },
  {
    id: "visual-res",
    title: "Visual Resonance",
    desc: "Generate charcoal-style illustrations based on descriptive passages from your books.",
    icon: Wand2,
    status: "Upcoming",
    href: "#",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/10",
  },
];

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

  const handlePlayEpisodeFromDetail = (episode: Episode, _season: Season) => {
    if (!userId) return;
    getUserAiArtifacts(userId, "podcast").then(artifacts => {
      const match = artifacts.find(a =>
        a.title === episode.title || a.content?.title === episode.title
      );
      if (match) {
        playerStore.play(match.content as PodcastScript, detailBook, episode.title);
      } else {
        handleGenerateEpisodeFromDetail(episode, _season);
      }
    });
  };

  const handleGenerateEpisodeFromDetail = async (episode: Episode, season: Season) => {
    if (!userId || !detailArtifact || !detailBook) return;
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("GEMINI_API_KEY") || "";
    if (!apiKey) { toast.error("No Gemini API key. Visit Settings to add one."); return; }

    playerStore.setGenerating(detailBook, episode.title);

    try {
      const sc = detailArtifact.content as any;
      const normalizedSeries: PodcastSeries = {
        id: detailArtifact.id, bookId: detailBook.id, createdAt: detailArtifact.createdAt,
        title: sc.title || detailBook.title, tone: sc.tone || "philosophical",
        totalSeasons: sc.totalSeasons || 1,
        seasons: sc.seasons || [{ number: 1, title: "Archive Echoes", description: "", episodes: sc.episodes || [] }],
        episodes: sc.episodes,
      };
      const scriptResult = await generateEpisodeScript(apiKey, normalizedSeries,
        { ...episode, id: episode.id || `ep-${episode.number}` }, "");
      await saveAiArtifact(userId, { book_id: detailBook.id, type: "podcast", title: episode.title, content: scriptResult });
      playerStore.setScript(scriptResult);
      toast.success(`"${episode.title}" is ready to play!`);
    } catch (err: any) {
      toast.error("Generation failed: " + (err.message || "Unknown error"));
      playerStore.close();
    }
  };

  return (
    <div className="relative min-h-screen pb-32">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[35%] bg-primary/4 blur-[140px] rounded-full" />
        <div className="absolute bottom-[15%] right-[-5%] w-[35%] h-[30%] bg-amber-500/4 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[15%] w-[25%] h-[20%] bg-blue-500/4 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-16 space-y-24">
        {/* Hero Header */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-2xl">
                <Sparkles className="w-9 h-9 text-primary" />
              </div>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
              The Resonance Lab
            </h1>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg font-serif italic leading-relaxed">
            Where ancient archives meet the echoes of future intelligence.<br className="hidden md:block" />
            Enhance your reading experience through curated AI augmentation.
          </motion.p>

          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="flex items-center justify-center gap-8 pt-2">
            {[
              { icon: Headphones, label: "Echo Chronicles", desc: "Active" },
              { icon: TrendingUp, label: "2 more features", desc: "Coming soon" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="w-4 h-4 text-primary/60" />
                <span className="font-serif"><span className="text-foreground font-bold">{item.label}</span> · {item.desc}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
              <Card className={cn(
                "group relative overflow-hidden h-full border-border/30 bg-card/30 backdrop-blur-md",
                "hover:border-primary/20 transition-all duration-700 rounded-[2rem] shadow-xl hover:shadow-2xl",
                f.glow
              )}>
                {/* Gradient fill on hover */}
                <div className={cn(`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`)} />

                <div className="relative p-8 space-y-7 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "p-3.5 rounded-2xl border transition-all duration-500",
                      f.accent,
                      "group-hover:scale-110 group-hover:shadow-xl"
                    )}>
                      <f.icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border",
                      f.status === "Active" ? f.accent : "bg-muted/30 border-border/30 text-muted-foreground"
                    )}>
                      {f.status}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1">
                    <h2 className="font-serif text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-500">
                      {f.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed font-serif italic">
                      {f.desc}
                    </p>
                  </div>

                  <div>
                    {f.status === "Active" ? (
                      <Link href={f.href}>
                        <Button className="w-full h-11 justify-between px-6 rounded-2xl bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent group/btn transition-all duration-300">
                          Invoke Feature
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled variant="outline" className="w-full h-11 rounded-2xl opacity-40 border-dashed text-xs">
                        Feature Dormant
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Resonance Archives */}
        <div className="pt-8 border-t border-border/30 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold">Resonance Archive</h2>
              <p className="text-sm text-muted-foreground font-serif italic mt-1">
                Your generated series and standalone episodes
              </p>
            </div>
          </div>
          {userId ? (
            <ResonanceArchives
              userId={userId}
              onReplay={handlePlaySingleArtifact}
              onOpenDetail={handleOpenDetail}
            />
          ) : (
            <div className="animate-pulse h-64 bg-muted/10 rounded-[3rem] border border-border/20 border-dashed" />
          )}
        </div>
      </div>

      {/* Netflix Detail View */}
      <AnimatePresence>
        {detailArtifact && (
          <ResonanceDetail
            artifact={detailArtifact}
            book={detailBook}
            onClose={() => { setDetailArtifact(null); setDetailBook(null); }}
            onPlayEpisode={handlePlayEpisodeFromDetail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
