"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, loading, signingIn, signIn, signUp } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/library");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        toast.success("Account created successfully!", {
          description: "Please check your email to confirm your account.",
        });
        setIsSignUp(false);
        setPassword("");
        setFullName("");
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      
      {/* LEFT PANEL: The Sanctuary Void (Desktop Only) */}
      <div className="hidden lg:flex relative w-1/2 flex-col justify-between overflow-hidden border-r border-border/20 bg-[#050505]">
        
        {/* Deep Atmospheric Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: "2s" }} />
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-vault-brass/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s', animationDelay: "4s" }} />
          
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)`,
            backgroundSize: '48px 48px',
          }} />
        </div>

        {/* Top Logo */}
        <div className="relative z-10 p-12 lg:p-16 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" strokeWidth={1.5} />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white/90">Epilogue Vault</span>
        </div>

        {/* Center Typography */}
        <div className="relative z-10 px-12 lg:px-16 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl space-y-6"
          >
            <h1 className="font-serif text-5xl xl:text-6xl text-white font-bold leading-[1.1] tracking-tight">
              A private vault <br/>
              <span className="text-vault-brass italic">for the written word.</span>
            </h1>
            <p className="text-lg text-white/60 font-serif italic max-w-md leading-relaxed">
              Experience the classics in an archive designed for profound immersion and timeless preservation.
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT PANEL: The Portal (Form) */}
      <div className="relative w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 bg-background">
        
        {/* Mobile Background (Subtle) */}
        <div className="absolute inset-0 z-0 lg:hidden">
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden flex-col items-center mb-12 space-y-4">
             <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
               <BookOpen className="w-8 h-8 text-primary" strokeWidth={1.5} />
             </div>
             <div className="text-center">
                  <h1 className="font-serif text-4xl font-bold tracking-tight">Epilogue Vault</h1>
                  <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-vault-brass mt-1">THE HERITAGE ARCHIVE</p>
             </div>
          </div>

          <div className="space-y-2 mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-serif font-semibold tracking-tight">
              {isSignUp ? "Join the Library" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Create your personal sanctuary to begin." : "Enter your credentials to access your collection."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {isSignUp && (
                <motion.div
                  key="fullName"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 pl-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-14 px-5 rounded-xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/40 text-sm"
                    placeholder="Erasmus"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 pl-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-5 rounded-xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/40 text-sm"
                placeholder="scholar@epilogue.vault"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between pl-1 pr-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Password</label>
                  {!isSignUp && (
                      <span className="text-[10px] font-medium text-muted-foreground/60 hover:text-primary cursor-pointer transition-colors">Forgot?</span>
                  )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-5 rounded-xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/40 text-sm"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-[13px] text-destructive flex items-center justify-center text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={signingIn}
              className="w-full h-14 mt-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-center group"
            >
              {signingIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-background/80" />
              ) : (
                <span className="flex items-center gap-3 font-medium text-[13px] tracking-wide">
                  {isSignUp ? "Cultivate Account" : "Enter the Vault"}
                  <ArrowRight className="w-4 h-4 text-background/50 group-hover:text-background group-hover:translate-x-1 transition-all" />
                </span>
              )}
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-8 text-center text-[13px] text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                 onClick={() => {
                     setIsSignUp(!isSignUp);
                     setError(null);
                 }}
                 className="font-semibold text-foreground hover:text-primary transition-colors focus:outline-none"
              >
                  {isSignUp ? "Sign In" : "Sign Up"}
              </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
