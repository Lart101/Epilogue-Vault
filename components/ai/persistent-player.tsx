"use client";

import { useEffect, useState } from "react";
import { playerStore, PlayerState } from "@/lib/player-store";
import { AnimatePresence } from "framer-motion";
import { SpotifyPlayer } from "@/components/ai/spotify-player";
import { getUserAiArtifacts, saveAiArtifact } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-service";
import { generateEpisodeScript } from "@/lib/gemini";
import { extractEpubText, extractPdfText } from "@/lib/extractors";

/**
 * Subscribes to the global playerStore and renders the SpotifyPlayer
 * as long as there's an active episode. Lives in the root layout so
 * it persists across page navigation.
 */
export function PersistentPlayer() {
  const [state, setState] = useState<PlayerState>(playerStore.getState());

  useEffect(() => {
    const unsub = playerStore.subscribe(setState);

    // Register navigation handler for Skip Next/Prev
    playerStore.onNavigateEpisode = async (episode, index) => {
      const user = await getCurrentUser();
      if (!user || !state.book || !state.series) return;

      // 1. Enter generating state immediately
      playerStore.setGenerating(state.book, episode.title, state.series, index);

      try {
        // 2. Check for existing script in database
        const artifacts = await getUserAiArtifacts(user.id, "podcast");
        const existing = artifacts.find(a => 
            a.book_id === state.book?.id && 
            a.content?.episodeNumber === episode.number
        );

        if (existing) {
          playerStore.play(existing.content, state.book, episode.title, state.series, index);
          return;
        }

        // 3. Extract text and generate if missing
        let text = "";
        try {
          text = state.book.fileType === "epub"
            ? await extractEpubText(state.book.fileUrl)
            : await extractPdfText(state.book.fileUrl);
        } catch (e) {
          console.warn("Text extraction failed in player navigation:", e);
          text = `Title: ${state.book.title}\nAuthor: ${state.book.author}`;
        }

        const scriptResult = await generateEpisodeScript(state.series, episode, text);
        
        // Save for next time
        await saveAiArtifact(user.id, {
            book_id: state.book.id,
            type: "podcast",
            title: `${state.series.title} (${state.series.tone}) - Ep ${episode.number}: ${episode.title}`,
            content: scriptResult,
        });

        playerStore.play(scriptResult, state.book, episode.title, state.series, index);
      } catch (err) {
        console.error("Failed to navigate to episode:", err);
        // Error handling: player might get stuck in isGenerating: true
        // We could reset or show an error state if the PlayerState supported it.
      }
    };

    return () => { unsub(); };
  }, [state.book, state.series]);

  const isActive = state.script !== null || state.isGenerating;

  return (
    <AnimatePresence>
      {isActive && (
        <SpotifyPlayer
          script={state.script}
          book={state.book}
          series={state.series}
          episodeIndex={state.currentEpisodeIndex}
          episodeTitle={state.episodeTitle}
          isGenerating={state.isGenerating}
          onClose={() => playerStore.close()}
        />
      )}
    </AnimatePresence>
  );
}
