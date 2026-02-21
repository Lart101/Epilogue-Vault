/**
 * Module-level generation store — no React dependency.
 * Fires subscribe callbacks when jobs change so any component can react.
 */

export type JobStatus = "pending" | "extracting" | "planning" | "generating" | "done" | "error";

export interface GenerationJob {
    id: string;
    bookTitle: string;
    bookCover?: string;
    tone: string;
    status: JobStatus;
    label: string;       // current phase label
    error?: string;
    artifactId?: string; // set when done
}

type Listener = (jobs: GenerationJob[]) => void;

class GenerationStore {
    private jobs: Map<string, GenerationJob> = new Map();
    private listeners: Set<Listener> = new Set();

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        const list = Array.from(this.jobs.values());
        this.listeners.forEach(fn => fn(list));
    }

    add(job: GenerationJob) {
        this.jobs.set(job.id, job);
        this.notify();
    }

    update(id: string, patch: Partial<GenerationJob>) {
        const job = this.jobs.get(id);
        if (!job) return;
        this.jobs.set(id, { ...job, ...patch });
        this.notify();
    }

    remove(id: string) {
        this.jobs.delete(id);
        this.notify();
    }

    getAll() {
        return Array.from(this.jobs.values());
    }
}

export const generationStore = new GenerationStore();
