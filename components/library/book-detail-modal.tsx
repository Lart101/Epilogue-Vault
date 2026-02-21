"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  Pencil,
  Trash2,
  FolderPlus,
  Check,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  updateBook,
  deleteBook,
  addBookToCollection,
  removeBookFromCollection,
  type UserBook,
  type Collection,
} from "@/lib/db";
import Image from "next/image";

interface BookDetailModalProps {
  book: UserBook | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (bookId: string, data: { title: string; author: string }) => Promise<void>;
  onDelete: (bookId: string) => Promise<void>;
  collections: Collection[];
  onToggleCollection: (collectionId: string, bookId: string, isInCollection: boolean) => Promise<void>;
}

export function BookDetailModal({
  book,
  open,
  onClose,
  onUpdate,
  onDelete,
  collections,
  onToggleCollection,
}: BookDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    if (!book) return;
    setTitle(book.title);
    setAuthor(book.author);
    setEditing(true);
  }

  async function handleSave() {
    if (!book || !title.trim()) return;
    setSaving(true);
    try {
      await onUpdate(book.id, { title: title.trim(), author: author.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!book) return;
    setDeleting(true);
    try {
      await onDelete(book.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  function handleClose() {
    setEditing(false);
    setConfirmDelete(false);
    onClose();
  }

  if (!book) return null;

  const progress = book.readingProgress?.percentage || 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] z-50 mx-auto max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-vault-brass shrink-0" strokeWidth={1.5} />
                <span className="font-serif text-lg font-semibold truncate">Book Details</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0 cursor-pointer"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Book header — cover + info */}
              <div className="flex gap-4">
                <div className="w-24 h-36 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/50">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={96}
                      height={144}
                      className="w-full h-full object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-vault-brass/10 to-vault-brass/5">
                      <BookOpen className="w-8 h-8 text-vault-brass/30" strokeWidth={1} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        className="h-9 font-serif font-semibold"
                      />
                      <Input
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Author"
                        className="h-9 text-sm"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving || !title.trim()}
                          className="h-7 text-xs bg-vault-brass hover:bg-vault-brass/90 text-white cursor-pointer"
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(false)}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {book.fileType.toUpperCase()}
                        </span>
                        {book.fileSize > 0 && (
                          <span>{(book.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                        )}
                        <span className="capitalize">{book.source}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="rounded-xl bg-secondary/50 border border-border/30 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Reading Progress</span>
                  <span className="font-semibold text-vault-brass">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-vault-brass to-vault-mahogany"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {progress === 0
                    ? "Not started yet"
                    : progress >= 100
                    ? "Finished! 🎉"
                    : `${Math.round(progress)}% complete`}
                </p>
              </div>

              {/* Collections */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FolderPlus className="w-3.5 h-3.5" />
                  Collections
                </div>
                {collections.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No collections yet. Create one from the library page!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {collections.map((col) => {
                      const isIn = col.bookIds?.includes(book.id);
                      return (
                        <button
                          key={col.id}
                          onClick={() => onToggleCollection(col.id, book.id, !!isIn)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer active:scale-95",
                            isIn
                              ? "bg-vault-brass/15 border-vault-brass/40 text-vault-brass"
                              : "bg-card border-border/60 text-muted-foreground hover:border-vault-brass/30"
                          )}
                        >
                          <span>{col.emoji}</span>
                          <span>{col.name}</span>
                          {isIn && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </div>
                <div className="flex gap-2">
                  {!editing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEdit}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Details
                    </Button>
                  )}
                  {!confirmDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Book
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 rounded-xl bg-destructive/10 border border-destructive/20 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Delete &quot;{book.title}&quot;? This cannot be undone.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="h-7 text-xs cursor-pointer"
                        >
                          {deleting ? "Deleting..." : "Yes, Delete"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(false)}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
