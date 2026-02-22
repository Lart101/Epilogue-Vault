"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Compass, Library, LogOut, Sparkles, Settings, Menu, X } from "lucide-react";
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
import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Magnetic } from "./ui/magnetic";
import { useScroll, useSpring as useSpringMotion } from "framer-motion";

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/discover", label: "Archives", icon: Compass },
  { href: "/ai-lab", label: "Resonance Lab", icon: Sparkles },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpringMotion(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!user) return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex flex-col items-center px-4 sm:px-6 pointer-events-none gap-4">
      <header 
        className={cn(
          "pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 h-14 px-4 sm:px-6 rounded-2xl transition-all duration-500 relative overflow-hidden",
          "glass border-border/40 shadow-2xl shadow-black/5 max-w-5xl w-full translate-z-0",
          isScrolled ? "h-12 mt-[-4px]" : "h-14"
        )}
      >
        {/* Scroll Progress Indicator */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary origin-left z-50"
          style={{ scaleX }}
        />

        {/* Logo Section */}
        <Magnetic strength={0.2}>
          <Link href="/library" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-500 group-hover:rotate-[30deg]">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={2} />
            </div>
            <span className="hidden sm:block font-serif text-lg font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Epilogue Vault
            </span>
          </Link>
        </Magnetic>

        {/* Center Navigation & Search */}
        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Magnetic key={item.href} strength={0.1}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-[700] uppercase tracking-[0.15em] transition-all duration-300 group",
                      isActive
                        ? "text-primary px-5"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavTab"
                        className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                        style={{ zIndex: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </Magnetic>
              );
            })}
          </nav>
          
        </div>

        {/* Right Section: Mobile Menu, Notifications, User */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Magnetic strength={0.3}>
              <ThemeToggle />
            </Magnetic>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative group flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all cursor-pointer">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-700 animate-pulse" />
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-primary/20 group-hover:border-primary/40 transition-colors z-10">
                  <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.user_metadata?.full_name || ""} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-68 mt-3 glass border-border/40 shadow-2xl rounded-3xl p-2 overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />
              <div className="px-4 py-4 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">Vault Scholar</p>
                <p className="text-base font-serif font-bold text-foreground">{user.user_metadata?.full_name || "Anonymous Scholar"}</p>
                <p className="text-xs text-muted-foreground/60 font-mono truncate mt-1">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-border/20 mx-2" />
              
              <div className="md:hidden p-2 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Archive</span>
                    <ThemeToggle />
                  </div>
              </div>

              <Link href="/settings">
                <DropdownMenuItem className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer transition-all">
                  <Settings className="w-4 h-4 mr-3" />
                  Scholarly Settings
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setShowLogoutConfirm(true);
                }}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer transition-all mt-1"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Relinquish Controls
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-secondary/50 text-foreground/70 hover:text-primary transition-all duration-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
        title="Relinquish Controls?"
        description="Are you sure you want to sign out of the Vault? Your digital residency will be paused until you return."
        confirmLabel="Deactivate Session"
        variant="danger"
      />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="md:hidden w-full max-w-sm pointer-events-auto"
          >
            <nav className="glass rounded-[2rem] p-4 shadow-3xl border-border/40 flex flex-col gap-2">
              <div className="px-4 py-2 mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">Quick Access</h3>
              </div>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-5 p-4 rounded-2xl transition-all duration-300",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl transition-colors", isActive ? "bg-primary/20" : "bg-secondary")}>
                       <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-serif text-xl font-bold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
