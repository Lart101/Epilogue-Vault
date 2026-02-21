"use client";

import { cn } from "@/lib/utils";
import { type Collection } from "@/lib/db";

interface CollectionChipProps {
  collection?: Collection;
  label?: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}

export function CollectionChip({
  collection,
  label,
  count,
  active,
  onClick,
}: CollectionChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer",
        "border hover:shadow-sm active:scale-95",
        active
          ? "bg-vault-brass/15 border-vault-brass/40 text-vault-brass shadow-sm"
          : "bg-card border-border/60 text-muted-foreground hover:border-vault-brass/30 hover:text-foreground"
      )}
    >
      {collection?.emoji && (
        <span className="text-sm leading-none">{collection.emoji}</span>
      )}
      <span>{label || collection?.name}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold px-1",
            active ? "bg-vault-brass/20 text-vault-brass" : "bg-secondary text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
