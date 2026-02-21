"use client";

import { useEffect, useCallback, useState } from "react";
import { OnboardingModal } from "./onboarding-modal";
import { useReader, ReaderProvider } from "./reader-context";
import { ReaderHeader } from "./reader-header";
import { ReaderLayout } from "./reader-layout"; 
import { ReaderFooter } from "./reader-footer"; 
import { ReaderSidebar } from "./reader-sidebar";
import { EpubReader } from "./epub-reader";
import { UltraPdfReader } from "./ultra-pdf-reader";
import { ReaderQuickNav } from "./reader-quick-nav";
import { useReadingSync } from "@/hooks/use-reading-sync";
import type { UserBook } from "@/lib/db";
import { Loader2 } from "lucide-react";


interface BookReaderProps {
  book: UserBook;
  bookId: string;
}

export default function BookReader({ book, bookId }: BookReaderProps) {
  // Error and loading handling for book prop
  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-muted-foreground">Loading book...</span>
      </div>
    );
  }
  if (!book.fileUrl || !book.fileType) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <span className="text-destructive font-semibold mb-2">Failed to load book file.</span>
        <span className="text-muted-foreground">This book is missing a file or file type. Please try re-importing.</span>
      </div>
    );
  }
  return (
    <ReaderProvider>
      <ReaderUI book={book} bookId={bookId} />
    </ReaderProvider>
  );
}

function ReaderUI({ book, bookId }: BookReaderProps) {
  const { setMeta, location, triggerAction } = useReader();
  const proxiedUrl = book.fileUrl!;
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding only on first visit (per device)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("vault-onboarding-seen");
      if (!seen) setShowOnboarding(true);
    }
  }, []);

  // Sync reading progress to the archives
  const getProgressLocation = useCallback(() => ({
    cfi: location.cfi,
    percentage: location.percentage,
    currentPage: location.currentPage || 0
  }), [location]);

  useReadingSync({
    bookId,
    getLocation: getProgressLocation
  });

  return (
    <ReaderLayout>
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      
      <div className="flex-1 h-full w-full relative bg-vault-paper/50">
        {/* Binding Crease (Center Shadow) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[40px] -translate-x-1/2 bg-gradient-to-r from-transparent via-black/5 to-transparent z-10 pointer-events-none" />
        
        {/* Soft Depth Container */}
        <div className="h-full w-full relative z-0 flex flex-col">
          {book.fileType === "pdf" ? (
            <UltraPdfReader 
              url={proxiedUrl} 
              initialPage={book.readingProgress?.currentPage || 1} 
            />
          ) : (
            <EpubReader 
              url={proxiedUrl} 
              initialLocation={book.readingProgress?.cfi} 
            />
          )}
        </div>

        {/* The Silk Ribbon (Floating Navigation Metaphor) */}
        <div className="absolute bottom-10 left-0 right-0 z-40 pointer-events-none">
          <ReaderQuickNav />
        </div>
      </div>
    </ReaderLayout>
  );
}
