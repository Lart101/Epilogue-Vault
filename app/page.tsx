"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/library");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background overflow-hidden relative selection:bg-primary/20 selection:text-primary">
      {/* Background Ambience - Enhanced for Dark/Light Mode */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] dark:blur-[160px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-vault-brass/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-14">
        {/* Animated Logo - Ultra Premium */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative group cursor-default"
        >
          <div className="w-28 h-28 rounded-[2.5rem] glass border border-primary/20 dark:border-border/40 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-700 group-hover:scale-105">
            <BookOpen className="w-12 h-12 text-primary drop-shadow-md" strokeWidth={1.5} />
          </div>
          
          {/* Pulsing ring */}
          <div className="absolute inset-0 w-28 h-28 rounded-[2.5rem] border-[3px] border-primary/30 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          {/* Subtle glow behind */}
          <div className="absolute inset-0 w-28 h-28 rounded-[2.5rem] bg-primary/20 blur-2xl -z-10 group-hover:bg-primary/30 transition-colors duration-700" />
        </motion.div>

        {/* Textual Entrance - Typography Refined */}
        <div className="flex flex-col items-center gap-4">
          <motion.h1 
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
            className="font-serif text-6xl md:text-7xl font-bold tracking-ultra-tight text-foreground"
          >
            Epilogue Vault
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, width: "0%" }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ delay: 1.0, duration: 1.5, ease: "anticipate" }}
            className="flex items-center gap-6 text-primary/60 dark:text-muted-foreground/50 overflow-hidden whitespace-nowrap"
          >
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-current" />
            <span className="text-[11px] font-[700] uppercase tracking-[0.6em] text-foreground/80 dark:text-foreground/70">
              The Heritage Archive
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-current" />
          </motion.div>
        </div>

        {/* Loading State - Minimalist */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="flex items-center gap-3 text-muted-foreground/60 italic text-sm bg-background/50 backdrop-blur-md px-4 py-2 rounded-full border border-border/50"
        >
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="tracking-wide">Unlocking the Vault...</span>
        </motion.div>
      </div>

      {/* Decorative details */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
        className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/30 dark:text-muted-foreground/20"
      >
        <span>© 2026 EPILOGUE ARCHIVES</span>
        <span>A PRIVATE SANCTUARY FOR THE WRITTEN WORD</span>
      </motion.div>
    </div>
  );
}
