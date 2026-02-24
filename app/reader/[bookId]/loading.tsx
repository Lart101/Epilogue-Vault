"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function ReaderLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-24 h-24 flex items-center justify-center rounded-2xl bg-vault-brass/10 border border-vault-brass/20 shadow-[0_0_30px_rgba(197,160,89,0.15)]"
        >
          {/* Inner pulse */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(197,160,89,0)",
                "0 0 0 20px rgba(197,160,89,0.1)",
                "0 0 0 40px rgba(197,160,89,0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-2xl"
          />
          <BookOpen className="w-10 h-10 text-vault-brass" strokeWidth={1} />
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <motion.h2 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-2xl font-bold tracking-tight text-foreground/90"
          >
            Opening Volume
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-serif text-sm italic text-muted-foreground"
          >
            Retrieving from the archives...
          </motion.p>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 overflow-hidden rounded-full bg-secondary mt-2">
          <motion.div
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 rounded-full bg-vault-brass shadow-[0_0_8px_rgba(197,160,89,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
