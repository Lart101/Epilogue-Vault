"use client";

import { useEffect, useState } from "react";
import { playerStore, PlayerState } from "@/lib/player-store";
import { AnimatePresence } from "framer-motion";
import { SpotifyPlayer } from "@/components/ai/spotify-player";

/**
 * Subscribes to the global playerStore and renders the SpotifyPlayer
 * as long as there's an active episode. Lives in the root layout so
 * it persists across page navigation.
 */
export function PersistentPlayer() {
  const [state, setState] = useState<PlayerState>(playerStore.getState());

  useEffect(() => {
    const unsub = playerStore.subscribe(setState);
    return () => { unsub(); };
  }, []);

  const isActive = state.script !== null || state.isGenerating;

  return (
    <AnimatePresence>
      {isActive && (
        <SpotifyPlayer
          script={state.script}
          book={state.book}
          episodeTitle={state.episodeTitle}
          isGenerating={state.isGenerating}
          onClose={() => playerStore.close()}
        />
      )}
    </AnimatePresence>
  );
}
