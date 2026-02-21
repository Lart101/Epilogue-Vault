"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, X, AlertCircle, Mic2 } from "lucide-react";
import { generationStore, GenerationJob } from "@/lib/generation-store";
import { cn } from "@/lib/utils";

export function BackgroundGenerationPill() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  useEffect(() => {
    setJobs(generationStore.getAll());
    const unsub = generationStore.subscribe(setJobs);
    return () => { unsub(); };
  }, []);

  // Auto-dismiss done/error jobs after 5s
  useEffect(() => {
    jobs.forEach(job => {
      if (job.status === "done" || job.status === "error") {
        setTimeout(() => generationStore.remove(job.id), 5000);
      }
    });
  }, [jobs]);

  const activeJobs = jobs.filter(j => j.status !== "done" && j.status !== "error");
  const completedJobs = jobs.filter(j => j.status === "done" || j.status === "error");
  const visibleJobs = [...activeJobs, ...completedJobs].slice(0, 3);

  if (visibleJobs.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[400] flex flex-col gap-3 items-end">
      <AnimatePresence>
        {visibleJobs.map(job => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-xs",
              job.status === "done"
                ? "bg-green-950/90 border-green-500/30 shadow-green-500/10"
                : job.status === "error"
                ? "bg-destructive/20 border-destructive/30"
                : "bg-[#1a1a1a]/95 border-white/10"
            )}
          >
            {/* Book thumb */}
            {job.bookCover ? (
              <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow">
                <img src={job.bookCover} className="w-full h-full object-cover" alt="" />
              </div>
            ) : (
              <div className="w-8 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Mic2 className="w-4 h-4 text-amber-500" />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">{job.bookTitle}</p>
              <p className={cn(
                "text-[10px] mt-0.5 font-medium truncate",
                job.status === "done" ? "text-green-400" :
                job.status === "error" ? "text-destructive" :
                "text-white/50"
              )}>
                {job.label}
              </p>
            </div>

            {/* Status icon */}
            <div className="flex-shrink-0">
              {job.status === "done" && (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {job.status === "error" && (
                <div className="w-6 h-6 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center">
                  <AlertCircle className="w-3 h-3 text-destructive" />
                </div>
              )}
              {(job.status === "pending" || job.status === "extracting" || job.status === "planning" || job.status === "generating") && (
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              )}
            </div>

            {/* Dismiss (done/error only) */}
            {(job.status === "done" || job.status === "error") && (
              <button
                onClick={() => generationStore.remove(job.id)}
                className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-white/40" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
