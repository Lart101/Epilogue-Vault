"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  X, Mic2, Loader2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PodcastScript } from "@/lib/gemini";
import { UserBook } from "@/lib/db";
import { cn } from "@/lib/utils";

interface SpotifyPlayerProps {
  script: PodcastScript | null;
  book: UserBook | null;
  episodeTitle?: string;
  isGenerating?: boolean;
  onClose: () => void;
  onExpand?: () => void;
}

export function SpotifyPlayer({ 
  script, book, episodeTitle, isGenerating = false, onClose, onExpand 
}: SpotifyPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    synthRef.current = typeof window !== "undefined" ? window.speechSynthesis : null;
    return () => synthRef.current?.cancel();
  }, []);

  useEffect(() => {
    // Reset on new script
    setCurrentLineIndex(0);
    setIsPlaying(false);
    synthRef.current?.cancel();
  }, [script]);

  const speakLine = (index: number) => {
    if (!script || !synthRef.current) return;
    if (index >= script.dialogue.length) {
      setIsPlaying(false);
      setCurrentLineIndex(0);
      return;
    }

    synthRef.current.cancel();
    const line = script.dialogue[index];
    if (line.text.startsWith("*[") && line.text.endsWith("]*")) {
      // Skip audio cues
      setCurrentLineIndex(index + 1);
      speakLine(index + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.volume = isMuted ? 0 : volume;
    utterance.rate = 0.92;

    const voices = synthRef.current.getVoices();
    const isHostA = line.speaker.toLowerCase().includes("a") || line.speaker.toLowerCase().includes("keeper");
    utterance.voice = voices.find(v => isHostA ? v.name.includes("Female") : v.name.includes("Male")) || voices[0] || null;

    utterance.onend = () => {
      const next = index + 1;
      setCurrentLineIndex(next);
      if (next < script.dialogue.length) speakLine(next);
      else setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const togglePlay = () => {
    if (!script) return;
    if (isPlaying) {
      synthRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (synthRef.current?.paused) {
        synthRef.current.resume();
      } else {
        speakLine(currentLineIndex);
      }
      setIsPlaying(true);
    }
  };

  const skipBack = () => {
    const prev = Math.max(0, currentLineIndex - 1);
    setCurrentLineIndex(prev);
    if (isPlaying) speakLine(prev);
  };

  const skipForward = () => {
    const next = Math.min((script?.dialogue.length || 1) - 1, currentLineIndex + 1);
    setCurrentLineIndex(next);
    if (isPlaying) speakLine(next);
  };

  const progress = script ? (currentLineIndex / script.dialogue.length) * 100 : 0;
  const currentLine = script?.dialogue[currentLineIndex];
  const isHostA = currentLine?.speaker.toLowerCase().includes("a") || currentLine?.speaker.toLowerCase().includes("keeper");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-[300]"
      >
        {/* Expanded Script View */}
        <AnimatePresence>
          {isExpanded && script && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "40vh", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#0a0a0a] border-t border-white/10 overflow-hidden"
            >
              <div className="h-full overflow-y-auto p-6 space-y-3 no-scrollbar">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-6 text-center">Script — Now Playing</p>
                {script.dialogue.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-4 p-4 rounded-2xl transition-all duration-500 cursor-pointer",
                      i === currentLineIndex 
                        ? "bg-amber-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5" 
                        : "opacity-40 hover:opacity-70 border border-transparent"
                    )}
                    onClick={() => { setCurrentLineIndex(i); if (isPlaying) speakLine(i); }}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                      line.speaker.toLowerCase().includes("a") || line.speaker.toLowerCase().includes("keeper") 
                        ? "bg-amber-500" : "bg-blue-400"
                    )} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{line.speaker}</p>
                      <p className="text-sm text-white/80 font-serif italic leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Player Bar */}
        <div className="bg-[#181818] border-t border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/60">
          {/* Progress Bar */}
          <div 
            className="h-1 bg-white/10 cursor-pointer group/progress"
            onClick={(e) => {
              if (!script) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const idx = Math.floor(ratio * script.dialogue.length);
              setCurrentLineIndex(idx);
              if (isPlaying) speakLine(idx);
            }}
          >
            <motion.div
              className="h-full bg-amber-500 group-hover/progress:bg-amber-400 relative"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
            </motion.div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 gap-4">
            {/* Left: Track Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {book?.coverUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg flex-shrink-0 border border-white/10">
                  <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic2 className="w-6 h-6 text-amber-500" />
                </div>
              )}
              
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate font-serif leading-tight">
                  {episodeTitle || script?.title || "Loading..."}
                </p>
                <p className="text-[11px] text-white/50 truncate font-serif italic">
                  {book?.title || "Resonance Echo"}
                </p>
                {currentLine && !isGenerating && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      isHostA ? "bg-amber-500" : "bg-blue-400"
                    )} />
                    <p className="text-[10px] text-white/30 truncate font-mono">
                      {currentLine.speaker}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Controls */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBack}
                  disabled={isGenerating || !script}
                  className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </Button>

                <Button
                  onClick={togglePlay}
                  disabled={isGenerating || !script}
                  className="h-12 w-12 rounded-full bg-white hover:scale-105 text-black transition-all shadow-xl disabled:opacity-40"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  disabled={isGenerating || !script}
                  className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </Button>
              </div>

              {script && (
                <p className="text-[10px] font-mono text-white/20">
                  {currentLineIndex + 1} / {script.dialogue.length} lines
                </p>
              )}
            </div>

            {/* Right: Volume + Script Toggle + Close */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "h-9 w-9 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all",
                  isExpanded && "text-amber-400 bg-amber-500/10"
                )}
                title="Toggle Script"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsMuted(!isMuted); }}
                className="h-9 w-9 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
