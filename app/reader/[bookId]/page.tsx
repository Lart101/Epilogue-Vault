"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserBook, type UserBook } from "@/lib/db";
import BookReader from "@/components/reader/reader-ui";
import { Loader2, BookX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

interface ReaderPageProps {
  params: Promise<{ bookId: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = use(params);
  const { user } = useAuth();
  const [book, setBook] = useState<UserBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadBook() {
      if (!user) return;
      try {
        const bookData = await getUserBook(user.id, bookId);
        if (bookData) {
          setBook(bookData);

          // "Pick up where you left off" toast
          if (bookData.readingProgress?.percentage > 0) {
            toast.info(
              `Pick up where you left off (${Math.round(bookData.readingProgress.percentage)}%)`,
              { duration: 4000 }
            );
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to load book:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [user, bookId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-vault-brass" />
          <p className="font-serif italic text-muted-foreground">Opening the Vault...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <BookX className="w-8 h-8 text-destructive/50" strokeWidth={1} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold">Book not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This book may have been removed from your library.
            </p>
          </div>
          <Link href="/library">
            <Button variant="outline" className="cursor-pointer">
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!book.fileUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <BookX className="w-8 h-8 text-amber-500/50" strokeWidth={1} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold">Content Unavailable</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              This book doesn&apos;t have a readable file attached.
            </p>
          </div>
          <Link href="/library">
            <Button variant="outline" className="cursor-pointer">
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <BookReader book={book} bookId={bookId} />;
}
