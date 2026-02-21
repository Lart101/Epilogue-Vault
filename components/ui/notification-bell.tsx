"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Mic2, Sparkles, AlertCircle, Info, X, Inbox } from "lucide-react";
import { notificationStore, Notification } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  success: Check, error: AlertCircle, episode: Mic2, series: Sparkles, info: Info,
};
const TYPE_COLORS: Record<string, string> = {
  success: "text-green-400 bg-green-500/10",
  error: "text-destructive bg-destructive/10",
  episode: "text-amber-400 bg-amber-500/10",
  series: "text-blue-400 bg-blue-500/10",
  info: "text-muted-foreground bg-muted/30",
};

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifs(notificationStore.getAll());
    const unsub = notificationStore.subscribe(setNotifs);
    return () => { unsub(); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) notificationStore.markAllRead();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={cn(
          "relative w-9 h-9 rounded-full flex items-center justify-center transition-all",
          "hover:bg-accent border border-transparent hover:border-border/40",
          open && "bg-accent border-border/40"
        )}
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 w-80 bg-popover/95 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold">Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {notifs.length > 0 && (
                  <button
                    onClick={() => notificationStore.clear()}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground font-serif italic">No notifications yet</p>
                  <p className="text-[11px] text-muted-foreground/50">
                    Episode completions and system updates appear here
                  </p>
                </div>
              ) : (
                <div>
                  {notifs.map((n, i) => {
                    const Icon = TYPE_ICONS[n.type] || Info;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "group relative flex items-start gap-3 px-5 py-4 border-b border-border/20 last:border-0",
                          "hover:bg-accent/50 transition-colors duration-200",
                          !n.read && "bg-amber-500/3"
                        )}
                      >
                        {/* Unread dot */}
                        {!n.read && (
                          <div className="absolute left-2 top-5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}

                        {/* Book cover or icon */}
                        {n.bookCover ? (
                          <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow border border-border/30 mt-0.5">
                            <img src={n.bookCover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ) : (
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", TYPE_COLORS[n.type])}>
                            <Icon className="w-4 h-4" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-tight truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2 font-serif italic">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-mono">
                            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                          </p>
                        </div>

                        {/* Dismiss */}
                        <button
                          onClick={(e) => { e.stopPropagation(); notificationStore.remove(n.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center mt-0.5"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
