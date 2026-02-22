
"use client";
// Alias for compatibility with hooks expecting useUser
// (must be after useAuth is defined)

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User } from "@supabase/supabase-js";
import { onAuthStateChanged, signInWithEmail, signUpWithEmail, signOut } from "@/lib/auth-service";
import { playerStore } from "@/lib/player-store";
import { generationStore } from "@/lib/generation-store";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signingIn: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    console.log("AuthProvider user changed:", user?.id);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      console.error("Sign in failed:", error);
      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
      if (signingIn) return;
      setSigningIn(true);
      try {
        await signUpWithEmail(email, password, fullName);
      } catch (error: any) {
        console.error("Sign up failed:", error);
        throw error;
      } finally {
        setSigningIn(false);
      }
    };

  const handleSignOut = async () => {
    try {
      playerStore.close();
      generationStore.clear();
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signingIn, signIn, signUp, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
