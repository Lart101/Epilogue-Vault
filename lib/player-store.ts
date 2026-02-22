import { PodcastScript, PodcastSeries, Episode } from "@/lib/gemini";
import { UserBook } from "@/lib/db";

export interface PlayerState {
    script: PodcastScript | null;
    book: UserBook | null;
    series: PodcastSeries | null;
    episodeTitle: string;
    currentEpisodeIndex: number;
    currentLineIndex: number;
    isPlaying: boolean;
    isGenerating: boolean;
    autoNext: boolean;
}

const defaultState: PlayerState = {
    script: null,
    book: null,
    series: null,
    episodeTitle: "",
    currentEpisodeIndex: -1,
    currentLineIndex: 0,
    isPlaying: false,
    isGenerating: false,
    autoNext: true,
};

type Listener = (state: PlayerState) => void;

class PlayerStore {
    private state: PlayerState = { ...defaultState };
    private listeners: Set<Listener> = new Set();

    /**
     * Optional handler for when the user clicks "Next/Prev" on the player
     * while a series is active.
     */
    public onNavigateEpisode?: (episode: Episode, index: number) => void;

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        this.listeners.forEach(fn => fn({ ...this.state }));
    }

    play(script: PodcastScript, book: UserBook | null, episodeTitle: string, series?: PodcastSeries, episodeIndex?: number) {
        this.state = {
            ...this.state,
            script,
            book,
            series: series || null,
            episodeTitle,
            currentEpisodeIndex: episodeIndex ?? -1,
            currentLineIndex: 0,
            isPlaying: true,
            isGenerating: false
        };
        this.notify();
    }

    setGenerating(book: UserBook | null, episodeTitle: string, series?: PodcastSeries, episodeIndex?: number) {
        this.state = {
            ...this.state,
            script: null,
            book,
            series: series || null,
            episodeTitle,
            currentEpisodeIndex: episodeIndex ?? -1,
            isGenerating: true,
            isPlaying: false
        };
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

    setAutoNext(autoNext: boolean) {
        this.state = { ...this.state, autoNext };
        this.notify();
    }

    setLineIndex(index: number) {
        this.state = { ...this.state, currentLineIndex: index };
        this.notify();
    }

    navigateToEpisode(index: number) {
        if (!this.state.series || !this.onNavigateEpisode) return;
        const episodes = this.state.series.seasons.flatMap(s => s.episodes);
        const target = episodes[index];
        if (target) {
            this.onNavigateEpisode(target, index);
        }
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
