/**
 * Global player store — persists episode playback across page navigation.
 */
import { PodcastScript } from "@/lib/gemini";
import { UserBook } from "@/lib/db";

export interface PlayerState {
    script: PodcastScript | null;
    book: UserBook | null;
    episodeTitle: string;
    currentLineIndex: number;
    isPlaying: boolean;
    isGenerating: boolean;
}

const defaultState: PlayerState = {
    script: null,
    book: null,
    episodeTitle: "",
    currentLineIndex: 0,
    isPlaying: false,
    isGenerating: false,
};

type Listener = (state: PlayerState) => void;

class PlayerStore {
    private state: PlayerState = { ...defaultState };
    private listeners: Set<Listener> = new Set();

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        this.listeners.forEach(fn => fn({ ...this.state }));
    }

    play(script: PodcastScript, book: UserBook | null, episodeTitle: string) {
        this.state = { script, book, episodeTitle, currentLineIndex: 0, isPlaying: true, isGenerating: false };
        this.notify();
    }

    setGenerating(book: UserBook | null, episodeTitle: string) {
        this.state = { ...this.state, script: null, book, episodeTitle, isGenerating: true, isPlaying: false };
        this.notify();
    }

    setScript(script: PodcastScript) {
        this.state = { ...this.state, script, isGenerating: false };
        this.notify();
    }

    setPlaying(isPlaying: boolean) {
        this.state = { ...this.state, isPlaying };
        this.notify();
    }

    setLineIndex(index: number) {
        this.state = { ...this.state, currentLineIndex: index };
        this.notify();
    }

    close() {
        this.state = { ...defaultState };
        this.notify();
    }

    getState() {
        return { ...this.state };
    }

    isActive() {
        return this.state.script !== null || this.state.isGenerating;
    }
}

export const playerStore = new PlayerStore();
