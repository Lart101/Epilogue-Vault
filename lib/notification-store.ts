/**
 * Notification store — accumulates system notifications.
 * Framework-agnostic pub/sub, same pattern as generation-store.
 */

export type NotifType = "info" | "success" | "error" | "episode" | "series";

export interface Notification {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
    bookCover?: string;
    bookTitle?: string;
}

type Listener = (notifs: Notification[]) => void;

class NotificationStore {
    private notifs: Notification[] = [];
    private listeners: Set<Listener> = new Set();

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify() {
        this.listeners.forEach(fn => fn([...this.notifs]));
    }

    push(n: Omit<Notification, "id" | "timestamp" | "read">) {
        const notif: Notification = {
            ...n,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
            read: false,
        };
        this.notifs = [notif, ...this.notifs].slice(0, 50); // keep last 50
        this.notify();
        return notif.id;
    }

    markRead(id: string) {
        this.notifs = this.notifs.map(n => n.id === id ? { ...n, read: true } : n);
        this.notify();
    }

    markAllRead() {
        this.notifs = this.notifs.map(n => ({ ...n, read: true }));
        this.notify();
    }

    remove(id: string) {
        this.notifs = this.notifs.filter(n => n.id !== id);
        this.notify();
    }

    clear() {
        this.notifs = [];
        this.notify();
    }

    getAll() {
        return [...this.notifs];
    }

    getUnreadCount() {
        return this.notifs.filter(n => !n.read).length;
    }
}

export const notificationStore = new NotificationStore();
