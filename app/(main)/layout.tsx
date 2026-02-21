"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Compass, Library, LogOut, Loader2 } from "lucide-react";
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

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/discover", label: "Archives", icon: Compass },
];

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
      {/* Navigation: Floating Sanctuary Bar */}
      <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
        <header className="pointer-events-auto flex items-center justify-between gap-8 h-14 px-6 rounded-2xl glass border-border/40 shadow-2xl shadow-black/5 max-w-2xl w-full translate-z-0">
          {/* Logo */}
          <Link href="/library" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-105">
              <BookOpen className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Epilogue Vault
            </span>
          </Link>

          {/* Center Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-[600] uppercase tracking-wider transition-all duration-300",
                    isActive
                      ? "text-primary hover:text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
                  <span className="hidden xs:block">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 rounded-xl bg-primary/5 border border-primary/20"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Theme & User Menu */}
          <div className="shrink-0 flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary hover:scale-105 transition-transform cursor-pointer">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.user_metadata?.full_name || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 glass border-border/40 shadow-xl rounded-2xl p-2">
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary/70">{user.user_metadata?.full_name || "Vault Keeper"}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Relinquish Controls
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

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
