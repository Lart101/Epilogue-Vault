"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  X, Loader2, ChevronDown, Radio
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
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  // Reset state on script change
  useEffect(() => {
    setCurrentLineIndex(0);
    return () => {
      stopAndCleanup();
    };
  }, [script]);

  // Handle page visibility/unload
  useEffect(() => {
    const handleBeforeUnload = () => stopAndCleanup();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const stopAndCleanup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoadingAudio(false);
  };

  const playAudioLine = async (index: number) => {
    if (!script) return;
    
    stopAndCleanup();
    
    if (index >= script.dialogue.length) {
      setCurrentLineIndex(0);
      return;
    }

    const line = script.dialogue[index];
    
    // Skip audio cues
    if (line.text.startsWith("*[") && line.text.endsWith("]*")) {
      setCurrentLineIndex(index + 1);
      playAudioLine(index + 1);
      return;
    }

    // Dynamically map the two random host names to consistent alternating voices
    const speakers = Array.from(new Set(script.dialogue.filter(d => !d.text.startsWith("*[")).map(d => d.speaker)));
    const firstSpeaker = speakers[0] || "";
    const isHostA = line.speaker === firstSpeaker;

    // Premium Azure Neural Voices via Edge API
    const voice = isHostA ? "en-US-AriaNeural" : "en-US-GuyNeural";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingAudio(true);
    setIsPlaying(true); // Optimistic UI

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line.text, voice }),
        signal: abortController.signal
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "TTS generation failed with status " + res.status);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.volume = isMuted ? 0 : volume;
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        const next = index + 1;
        setCurrentLineIndex(next);
        if (next < script.dialogue.length) {
          playAudioLine(next);
        } else {
          setIsPlaying(false);
        }
      };

      await audio.play();
      setIsLoadingAudio(false);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, ignore gracefully
      } else {
        console.error("Audio playback error:", err);
        setIsLoadingAudio(false);
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!script) return;
    
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      else if (abortControllerRef.current) abortControllerRef.current.abort(); // Stop pending fetch
      setIsPlaying(false);
      setIsLoadingAudio(false);
    } else {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        playAudioLine(currentLineIndex);
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Auto-scroll the script view to the active line when expanded
  useEffect(() => {
    if (isExpanded && scriptContainerRef.current) {
      const activeElement = scriptContainerRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex, isExpanded]);

  const skipBack = () => {
    const prev = Math.max(0, currentLineIndex - 1);
    setCurrentLineIndex(prev);
    if (isPlaying || isLoadingAudio) playAudioLine(prev);
  };

  const skipForward = () => {
    const next = Math.min((script?.dialogue.length || 1) - 1, currentLineIndex + 1);
    setCurrentLineIndex(next);
    if (isPlaying || isLoadingAudio) playAudioLine(next);
  };

  const progress = script ? (currentLineIndex / script.dialogue.length) * 100 : 0;
  const currentLine = script?.dialogue[currentLineIndex];
  const isHostA = currentLine?.speaker.toLowerCase().includes("a") || currentLine?.speaker.toLowerCase().includes("keeper");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 150, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 150, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-4xl z-[300]"
      >
        {/* Expanded Script View Backdrop Blur */}
        <AnimatePresence>
            {isExpanded && script && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-[-100vh] bg-black/60 backdrop-blur-md z-[-1]"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </AnimatePresence>

        {/* Expanded Script View */}
        <AnimatePresence>
          {isExpanded && script && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 20 }}
              animate={{ height: "65vh", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-3xl mb-4"
            >
              <div ref={scriptContainerRef} className="h-full overflow-y-auto p-6 md:p-10 space-y-4 no-scrollbar relative scroll-smooth">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0a0a0a]/90 to-transparent pointer-events-none z-10" />
                
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mb-10 text-center sticky top-4 z-20">
                  Script — Now Playing
                </p>
                {script.dialogue.map((line, i) => (
                  <div
                    key={i}
                    data-active={i === currentLineIndex}
                    className={cn(
                      "flex gap-5 p-5 rounded-3xl transition-all duration-500 cursor-pointer",
                      i === currentLineIndex 
                        ? "bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.03)] scale-[1.02]" 
                        : "opacity-40 hover:opacity-70 border border-transparent hover:bg-white/[0.02]"
                    )}
                    onClick={() => { setCurrentLineIndex(i); if (isPlaying) playAudioLine(i); }}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_10px_rgba(inherit)]",
                      line.speaker.toLowerCase().includes("a") || line.speaker.toLowerCase().includes("keeper") 
                        ? "bg-amber-500 shadow-amber-500/50" : "bg-blue-400 shadow-blue-400/50"
                    )} />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1.5 flex items-center gap-2">
                        {line.speaker}
                        {i === currentLineIndex && isPlaying && !isLoadingAudio && (
                           <span className="flex gap-0.5 h-2 items-center">
                              <motion.span animate={{ height: ["4px", "8px", "4px"] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-0.5 bg-current rounded-full" />
                              <motion.span animate={{ height: ["4px", "10px", "4px"] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-0.5 bg-current rounded-full" />
                              <motion.span animate={{ height: ["4px", "6px", "4px"] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-0.5 bg-current rounded-full" />
                           </span>
                        )}
                      </p>
                      <p className={cn(
                        "text-base md:text-lg font-serif italic leading-relaxed transition-colors duration-500",
                        i === currentLineIndex ? "text-white" : "text-white/70"
                      )}>{line.text}</p>
                    </div>
                  </div>
                ))}
                <div className="h-10" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Player Bar */}
        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden relative z-20">
          {/* Progress Bar */}
          <motion.div 
            whileHover={{ scaleY: 2 }}
            className="h-1.5 bg-white/10 cursor-pointer group/progress relative overflow-hidden transition-all mt-[-2px] origin-top z-30"
            onClick={(e) => {
              if (!script) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const idx = Math.floor(ratio * script.dialogue.length);
              setCurrentLineIndex(idx);
              if (isPlaying) playAudioLine(idx);
            }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-sm" />
            </motion.div>
          </motion.div>

          <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-4 max-w-7xl mx-auto">
            {/* Left: Track Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {book?.coverUrl ? (
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 relative group-hover:scale-105 transition-transform">
                  <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/20" />
                  
                  {/* Audio Visualizer Overlay */}
                  <AnimatePresence>
                    {isPlaying && !isLoadingAudio && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-1"
                      >
                        <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-white rounded-full" />
                        <motion.div animate={{ height: ["12px", "24px", "12px"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                        <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 bg-white rounded-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-amber-500/5 border border-amber-500/20 relative flex items-center justify-center flex-shrink-0 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)] overflow-hidden">
                  <Radio className="w-6 h-6 text-amber-500/70" />
                  
                  {/* Audio Visualizer Overlay Fallback */}
                  <AnimatePresence>
                    {isPlaying && !isLoadingAudio && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-[2px] flex items-center justify-center gap-1"
                      >
                        <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-amber-400 rounded-full" />
                        <motion.div animate={{ height: ["12px", "24px", "12px"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-amber-400 rounded-full" />
                        <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 bg-amber-400 rounded-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              <div className="min-w-0 flex flex-col justify-center">
                <p className="text-sm md:text-base font-bold text-white truncate font-serif leading-tight">
                  {episodeTitle || script?.title || "Loading..."}
                </p>
                <p className="text-[11px] md:text-xs text-white/50 truncate font-serif italic mt-0.5">
                  {book?.title || "Resonance Echo"}
                </p>
                {currentLine && !isGenerating && (
                  <div className="flex items-center gap-1.5 mt-1.5 hidden sm:flex">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(inherit)]",
                      isHostA ? "bg-amber-500 shadow-amber-500" : "bg-blue-400 shadow-blue-400"
                    )} />
                    <p className="text-[9px] text-white/40 truncate font-mono uppercase tracking-widest">
                      {currentLine.speaker}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Controls */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4 md:gap-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={skipBack}
                  disabled={isGenerating || !script}
                  className="h-10 w-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:hover:scale-100"
                >
                  <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                  disabled={isGenerating || !script}
                  className={cn(
                    "h-14 w-14 md:h-16 md:w-16 flex items-center justify-center rounded-full text-black transition-colors disabled:opacity-40 disabled:hover:scale-100",
                     isLoadingAudio ? "bg-white/50" : isPlaying ? "bg-white shadow-[0_0_30px_rgba(255,255,255,0.3)]" : "bg-white shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : isLoadingAudio ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 md:w-7 md:h-7 fill-current ml-1" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={skipForward}
                  disabled={isGenerating || !script}
                  className="h-10 w-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:hover:scale-100"
                >
                  <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                </motion.button>
              </div>
            </div>

            {/* Right: Volume + Script Toggle + Close */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
              <span className="text-[10px] font-mono text-white/20 hidden lg:block mr-2">
                {script ? `${currentLineIndex + 1} / ${script.dialogue.length}` : ''}
              </span>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors relative",
                  isExpanded && "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                )}
                title="Toggle Script"
              >
                <ChevronDown className={cn("w-5 h-5 transition-transform duration-500", isExpanded && "rotate-180")} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setIsMuted(!isMuted); }}
                className="h-10 w-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </motion.button>

              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
