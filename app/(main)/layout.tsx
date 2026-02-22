"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Compass, Library, LogOut, Loader2, Sparkles, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundGenerationPill } from "@/components/ai/background-generation-pill";
import { NotificationBell } from "@/components/ui/notification-bell";
import { PersistentPlayer } from "@/components/ai/persistent-player";
import { Navbar } from "@/components/navbar";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary-foreground">
      <BackgroundGenerationPill />
      <PersistentPlayer />
      
      <Navbar />

      <div className="pt-24 lg:pt-28">

      {/* Page Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="mx-auto max-w-7xl px-6 py-8"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      </div>
    </div>
  );
}
