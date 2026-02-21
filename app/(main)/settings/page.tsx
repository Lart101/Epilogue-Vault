"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { 
  getTrashedBooks, getTrashedAiArtifacts, 
  restoreBook, restoreAiArtifact, deleteBook, deleteAiArtifact,
  UserBook, AiArtifact
} from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, RotateCcw, ShieldAlert, Settings as SettingsIcon, 
  History, Key, User, Book, Sparkles, Lock, Eye, EyeOff,
  Trash, CheckCircle2, ExternalLink, AlertCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const { user } = useAuth();
  const [trashedBooks, setTrashedBooks] = useState<UserBook[]>([]);
  const [trashedArtifacts, setTrashedArtifacts] = useState<AiArtifact[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadTrash();
      const savedKey = localStorage.getItem("GEMINI_API_KEY") || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
      setApiKey(savedKey);
    }
  }, [user]);

  const loadTrash = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [books, artifacts] = await Promise.all([
        getTrashedBooks(user.id),
        getTrashedAiArtifacts(user.id)
      ]);
      setTrashedBooks(books);
      setTrashedArtifacts(artifacts);
    } catch {
      toast.error("Failed to load recovery archives.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBook = async (id: string) => {
    if (!user) return;
    try {
      await restoreBook(user.id, id);
      setTrashedBooks(prev => prev.filter(b => b.id !== id));
      toast.success("Volume restored to library.");
    } catch { toast.error("Restoration failed."); }
  };

  const handleRestoreArtifact = async (id: string) => {
    if (!user) return;
    try {
      await restoreAiArtifact(user.id, id);
      setTrashedArtifacts(prev => prev.filter(a => a.id !== id));
      toast.success("Echo restored to archives.");
    } catch { toast.error("Restoration failed."); }
  };

  const handlePermanentDeleteBook = async (id: string) => {
    if (!user || !confirm("Permanently erase this volume? This cannot be undone.")) return;
    try {
      await deleteBook(user.id, id);
      setTrashedBooks(prev => prev.filter(b => b.id !== id));
      toast.success("Volume permanently erased.");
    } catch { toast.error("Purging failed."); }
  };

  const handlePermanentDeleteArtifact = async (id: string) => {
    if (!user || !confirm("Permanently erase this resonance echo?")) return;
    try {
      await deleteAiArtifact(user.id, id);
      setTrashedArtifacts(prev => prev.filter(a => a.id !== id));
      toast.success("Echo permanently erased.");
    } catch { toast.error("Purging failed."); }
  };

  const saveApiKey = () => {
    localStorage.setItem("GEMINI_API_KEY", apiKey);
    toast.success("Aether credentials updated.");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must differ from current password.");
      return;
    }
    setIsChangingPassword(true);
    try {
      // Step 1: verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) {
        toast.error("Current password is incorrect.");
        return;
      }
      // Step 2: update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Vault key updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isOAuthUser = user?.app_metadata?.provider !== "email";

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Vault Configuration</h1>
        </div>
        <p className="text-muted-foreground font-serif italic text-sm">
          Manage your sanctuary's credentials, archives, and recovery logs.
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-8">
        <TabsList className="bg-muted/20 p-1 rounded-2xl border border-border/30 h-auto flex-wrap gap-1">
          {[
            { value: "account", icon: User, label: "Profile" },
            { value: "ai", icon: Key, label: "AI Config" },
            { value: "trash", icon: Trash, label: "Recovery" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="rounded-xl px-5 py-2 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Account Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="account" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Profile card */}
          <Card className="overflow-hidden rounded-[2rem] border-border/30 bg-card/40">
            <div className="h-20 bg-gradient-to-r from-primary/20 via-amber-500/10 to-primary/5" />
            <div className="px-8 pb-8 -mt-10 space-y-6">
              <div className="flex items-end gap-5">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border-4 border-background flex items-center justify-center text-3xl font-serif font-bold text-primary shadow-xl">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
                </div>
                <div className="pb-1">
                  <h2 className="font-serif text-2xl font-bold">{user?.user_metadata?.full_name || "Vault Keeper"}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Status", value: "Active Keeper" },
                  { label: "Auth Provider", value: user?.app_metadata?.provider || "email" },
                  { label: "Member Since", value: user?.created_at ? format(new Date(user.created_at), "MMM yyyy") : "—" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-serif font-bold capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-8 rounded-[2rem] border-border/30 bg-card/40 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Lock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold">Change Vault Key</h2>
                  <p className="text-xs text-muted-foreground font-serif italic">Update your account password</p>
                </div>
              </div>
              {isOAuthUser && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1 rounded-full bg-muted/30 border border-border/30">
                  Managed by {user?.app_metadata?.provider}
                </span>
              )}
            </div>

            {isOAuthUser ? (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/20 border border-border/30">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground font-serif italic">
                  Your account uses {user?.app_metadata?.provider} for authentication. Password management is handled through your {user?.app_metadata?.provider} account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-serif italic">All fields required</p>
                  <button onClick={() => setShowPasswords(p => !p)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPasswords ? "Hide" : "Show"}
                  </button>
                </div>
                {[
                  { label: "Current Password", value: currentPassword, setter: setCurrentPassword, placeholder: "Your existing password" },
                  { label: "New Password", value: newPassword, setter: setNewPassword, placeholder: "Min. 8 characters" },
                  { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, placeholder: "Repeat new password" },
                ].map(field => (
                  <div key={field.label} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                      {field.label}
                    </label>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      className="h-12 rounded-2xl border-border/40 px-5 font-mono text-sm"
                    />
                  </div>
                ))}
                {newPassword && confirmPassword && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={cn("text-xs font-serif flex items-center gap-2",
                      newPassword === confirmPassword ? "text-green-500" : "text-destructive")}>
                    {newPassword === confirmPassword
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                      : <><AlertCircle className="w-3.5 h-3.5" /> Passwords don't match</>}
                  </motion.p>
                )}
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="h-11 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 gap-2"
                >
                  {isChangingPassword ? "Updating..." : "Update Vault Key"}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── AI Config Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="ai" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="p-8 bg-card/40 border-border/30 space-y-8 rounded-[2rem]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-serif text-xl font-bold">Aether Credentials</h2>
                </div>
                <p className="text-sm text-muted-foreground font-serif italic ml-11">
                  Your Gemini API key — powers the Archive Keepers' intelligence.
                </p>
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter your Gemini API key..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="h-13 rounded-2xl border-border/40 px-5 pr-12 font-mono text-sm"
                  />
                  <button onClick={() => setShowApiKey(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {apiKey && (
                <div className="flex items-center gap-2 text-xs text-green-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-mono">Key configured — {apiKey.length} characters</span>
                </div>
              )}
              <Button onClick={saveApiKey} disabled={!apiKey}
                className="h-11 px-8 rounded-2xl gap-2">
                Bind Credentials
              </Button>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Stored locally on your device only — never sent to our servers.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ── Trash Tab ────────────────────────────────────────────────────────── */}
        <TabsContent value="trash" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Trashed Books */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <div className="flex items-center gap-3">
                <Book className="w-4 h-4 text-amber-500" />
                <h2 className="font-serif text-lg font-bold">Discarded Volumes</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1 rounded-full bg-muted/30">
                {trashedBooks.length} items
              </span>
            </div>
            <AnimatePresence>
              {trashedBooks.length === 0 ? (
                <EmptyState icon={History} label="No discarded volumes found." />
              ) : (
                <div className="space-y-3">
                  {trashedBooks.map((book, i) => (
                    <motion.div key={book.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}>
                      <Card className="group flex items-center gap-4 p-4 bg-card/30 border-border/30 hover:border-amber-500/20 transition-all duration-300 rounded-2xl">
                        <div className="w-12 h-16 rounded-xl overflow-hidden border border-border/30 bg-muted/20 flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                          {book.coverUrl
                            ? <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />
                            : <Book className="w-full h-full p-3 text-muted-foreground/20" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-bold text-sm leading-tight truncate">{book.title}</p>
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">{book.author}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-1">
                            Trashed {book.deletedAt ? format(new Date(book.deletedAt), "MMM d, h:mm a") : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleRestoreBook(book.id)}
                            className="rounded-xl gap-2 hover:bg-green-500/10 hover:text-green-500 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePermanentDeleteBook(book.id)}
                            className="rounded-xl gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <ShieldAlert className="w-3.5 h-3.5" /> Purge
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </section>

          {/* Trashed Artifacts */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h2 className="font-serif text-lg font-bold">Discarded Resonances</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1 rounded-full bg-muted/30">
                {trashedArtifacts.length} echoes
              </span>
            </div>
            <AnimatePresence>
              {trashedArtifacts.length === 0 ? (
                <EmptyState icon={History} label="No discarded resonances found." />
              ) : (
                <div className="space-y-3">
                  {trashedArtifacts.map((artifact, i) => (
                    <motion.div key={artifact.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}>
                      <Card className="group flex items-center gap-4 p-4 bg-card/30 border-border/30 hover:border-blue-500/20 transition-all duration-300 rounded-2xl">
                        <div className={cn("p-3 rounded-xl border flex-shrink-0",
                          artifact.type === "podcast-series"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500")}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-bold text-sm leading-tight truncate">{artifact.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                              {artifact.type === "podcast-series" ? "Series Blueprint" : "Episode Echo"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">
                              · Trashed {artifact.deletedAt ? format(new Date(artifact.deletedAt), "MMM d") : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleRestoreArtifact(artifact.id)}
                            className="rounded-xl gap-2 hover:bg-green-500/10 hover:text-green-500 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePermanentDeleteArtifact(artifact.id)}
                            className="rounded-xl gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <ShieldAlert className="w-3.5 h-3.5" /> Purge
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="p-12 rounded-[2rem] border border-dashed border-border/30 flex flex-col items-center justify-center text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground/30" />
      </div>
      <p className="text-sm text-muted-foreground font-serif italic">{label}</p>
    </div>
  );
}
