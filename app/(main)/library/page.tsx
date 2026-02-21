"use client";

import { useDropzone } from "react-dropzone";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { searchBooks } from "@/lib/gutendex";
import {
  getUserBooks,
  getUserCollections,
  createCollection,
  deleteCollection,
  updateCollection,
  addBookToLibrary,
  updateBook,
  deleteBook,
  addBookToCollection,
  removeBookFromCollection,
  getFeaturedStoreBooks,
  addStoreBookToLibrary,
  type UserBook,
  type Collection,
} from "@/lib/db";
import { uploadBookFile, deleteBookFile, uploadCoverImage } from "@/lib/storage-service";
import { BookCard } from "@/components/library/book-card";
import { HeroBook } from "@/components/library/hero-book";
import { BookCardList } from "@/components/library/book-card-list";
import { BookDetailModal } from "@/components/library/book-detail-modal";
import { CollectionChip } from "@/components/library/collection-chip";
import { CreateCollectionDialog } from "@/components/library/create-collection-dialog";
import { UploadZone } from "@/components/library/upload-zone";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Loader2, Search, LayoutGrid, List, SortAsc, FolderPlus, TrendingUp, BookMarked, Library, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortOption = "recent" | "title" | "author" | "progress";
type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // UX state
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Modal state
  const [detailBook, setDetailBook] = useState<UserBook | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  // ─── Global Dropzone ─────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    accept: {
      "application/epub+zip": [".epub"],
      "application/pdf": [".pdf"],
    },
    noClick: true, // Disable click to upload on the main area, only drag
    noKeyboard: true,
  });

  useEffect(() => {
    const savedSort = localStorage.getItem("vault_library_sort") as SortOption;
    if (savedSort) setSort(savedSort);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [booksData, collectionsData] = await Promise.all([
        getUserBooks(user.id),
        getUserCollections(user.id),
      ]);
      setBooks(booksData);
      setCollections(collectionsData);
    } catch (error) {
      console.error("Failed to load library:", error);
      toast.error("Failed to load your library");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("vault_library_sort", sort);
  }, [sort]);

  useEffect(() => {
    if (!user) return;
    loadData();

    // Refresh on focus for real-time progress updates
    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, loadData]);

  async function handleUpload(file: File) {
    if (!user) return;
    const fileType = file.name.endsWith(".epub") ? "epub" : "pdf";
    let title = file.name.replace(/\.(epub|pdf)$/i, "").replace(/[-_]/g, " ");
    let author = "Unknown Author";
    let coverUrl = "";

    const toastId = toast.loading("Processing book...");

    try {
      // 1. Extract Metadata & Cover if EPUB
      if (fileType === "epub") {
        try {
            const ePub = (await import("epubjs")).default;
            // Parse EPUB
            const buffer = await file.arrayBuffer();
            const book = ePub(buffer);
            
            await book.ready;
            const meta = await book.loaded.metadata;
            
            if (meta.title) title = meta.title;
            if (meta.creator) author = meta.creator;

            // Extract Cover
            const coverUrlInternal = await book.coverUrl();
            if (coverUrlInternal) {
                // Fetch the blob from the internal URL
                const response = await fetch(coverUrlInternal);
                const blob = await response.blob();
                
                // Upload to Supabase
                const coverFile = new File([blob], "cover.jpg", { type: "image/jpeg" });
                coverUrl = await uploadCoverImage(coverFile, user.id);
            } else {
                // FALLBACK: Search Gutendex
                try {
                   console.log("No internal cover found, searching Gutendex for:", title);
                   const searchResults = await searchBooks(`${title} ${author !== "Unknown Author" ? author : ""}`);
                   const bestMatch = searchResults.find(b => b.coverUrl && b.coverUrl.length > 0);
                   
                   if (bestMatch?.coverUrl) {
                       // Fetch from Gutendex/Gutenberg
                       const response = await fetch(bestMatch.coverUrl);
                       const blob = await response.blob();
                       
                       // Upload to Supabase
                       const coverFile = new File([blob], "cover-gd.jpg", { type: "image/jpeg" });
                       coverUrl = await uploadCoverImage(coverFile, user.id);
                       console.log("Found cover from Gutendex:", coverUrl);
                   }
                } catch (gdErr) {
                    console.warn("Gutendex fallback failed:", gdErr);
                }
            }
        } catch (err) {
            console.warn("Failed to extract EPUB metadata:", err);
            // Continue with default filename/author
        }
      }

      // 2. Upload Book File
      const { promise } = uploadBookFile(file, user.id);
      const fileUrl = await promise;
      
      // 3. Save to DB
      await addBookToLibrary(user.id, {
        title,
        author,
        coverUrl,
        fileUrl,
        fileType: fileType as "epub" | "pdf",
        fileSize: file.size,
        source: "upload",
      });

      toast.dismiss(toastId);
      toast.success(`"${title}" added to your library`);
      loadData();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.dismiss(toastId);
      toast.error("Upload failed. Please try again.");
    }
  }

  async function handleUpdateBook(bookId: string, data: { title: string; author: string }) {
    if (!user) return;
    try {
      await updateBook(user.id, bookId, data);
      toast.success("Book updated");
      loadData();
    } catch {
      toast.error("Failed to update book");
    }
  }

  async function handleDeleteBook(bookId: string) {
    if (!user) return;
    try {
      const book = books.find((b) => b.id === bookId);
      if (book?.fileUrl && book.source === "upload") {
        await deleteBookFile(book.fileUrl); 
      }
      await deleteBook(user.id, bookId);
      toast.success("Book deleted");
      loadData();
    } catch {
      toast.error("Failed to delete book");
    }
  }

  async function handleToggleCollection(collectionId: string, bookId: string, isIn: boolean) {
    if (!user) return;
    try {
      if (isIn) {
        await removeBookFromCollection(user.id, collectionId, bookId);
      } else {
        await addBookToCollection(user.id, collectionId, bookId);
      }
      loadData();
    } catch {
      toast.error("Failed to update collection");
    }
  }

  async function handleCreateCollection(data: { name: string; emoji: string; color: string }) {
    if (!user) return;
    try {
      await createCollection(user.id, data);
      toast.success(`"${data.name}" collection created!`);
      setShowCreateCollection(false);
      loadData();
    } catch {
      toast.error("Failed to create collection");
    }
  }

  function openBookDetail(book: UserBook) {
    setDetailBook(book);
    setDetailOpen(true);
  }

  // ─── Filtering & Sorting ─────────────────────────────────────

  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Collection filter
    if (activeCollection) {
      const col = collections.find((c) => c.id === activeCollection);
      if (col) {
        result = result.filter((b) => col.bookIds?.includes(b.id));
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "progress":
          return (b.readingProgress?.percentage || 0) - (a.readingProgress?.percentage || 0);
        case "recent":
        default:
             // Use addedAt or lastReadAt strings.
             // Supabase returns ISO strings.
          const aTime = new Date(a.lastReadAt || a.addedAt).getTime();
          const bTime = new Date(b.lastReadAt || b.addedAt).getTime();
          return bTime - aTime;
      }
    });

    return result;
  }, [books, collections, activeCollection, search, sort]);

  // Stats
  const stats = useMemo(() => {
    const total = books.length;
    const inProgress = books.filter(
      (b) => (b.readingProgress?.percentage || 0) > 0 && (b.readingProgress?.percentage || 0) < 100
    ).length;
    const completed = books.filter((b) => (b.readingProgress?.percentage || 0) >= 100).length;
    return { total, inProgress, completed };
  }, [books]);

  const continueReading = books
    .filter((b) => {
      const p = b.readingProgress?.percentage || 0;
      return p > 0 && p < 100;
    })
    .slice(0, 4);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recent", label: "Recently Read" },
    { value: "title", label: "Title A→Z" },
    { value: "author", label: "Author A→Z" },
    { value: "progress", label: "Most Progress" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 bg-vault-paper/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="font-serif italic text-sm text-muted-foreground">Consulting the Archives...</p>
      </div>
    );
  }



  return (
    <div {...getRootProps()} className="relative min-h-[80vh] outline-none">
      <input {...getInputProps()} />
      
      {/* Global Drag Overlay */}
      <AnimatePresence>
        {isDragActive && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md border-2 border-vault-brass/50 m-4 rounded-3xl"
           >
              <motion.div
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center gap-4 p-8 bg-card shadow-2xl rounded-2xl border border-border"
              >
                  <div className="w-20 h-20 rounded-full bg-vault-brass/10 flex items-center justify-center">
                    <FolderPlus className="w-10 h-10 text-vault-brass" strokeWidth={1.5} />
                  </div>
                  <div className="text-center space-y-1">
                      <h3 className="font-serif text-2xl font-bold">Induct Volume</h3>
                      <p className="text-muted-foreground">Add to your vault archive instantly</p>
                  </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
      {/* Header + Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="space-y-1">
          <h1 className="font-serif text-5xl font-bold tracking-ultra-tight text-foreground/90">
            The Collection
          </h1>
          <p className="font-serif text-lg italic text-muted-foreground/60">
            {books.length === 0
              ? "Your vault awaits its first acquisition."
              : `A curated assembly of ${books.length} volumes.`}
          </p>
        </div>

        {/* Stats Bar */}
        {books.length > 0 && (
          <div className="flex gap-2.5">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border-border/40 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{stats.total} Total</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border-border/40 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{stats.inProgress} Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border-border/40 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{stats.completed} Finished</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Hero Section (Last Read) */}
      {continueReading.length > 0 && (
        <section className="space-y-6 pt-4">
           <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 font-mono">Current Resonances</h2>
           </div>
           <HeroBook book={continueReading[0]} />
        </section>
      )}

      {/* Other Recent Books */}
      {continueReading.length > 1 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
              <BookMarked className="w-4 h-4 text-primary/60" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 font-mono">Awaiting Resumption</h2>
           </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
            {continueReading.slice(1).map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                index={i}
                onDetails={() => openBookDetail(book)}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <UploadZone onUpload={handleUpload} />
      </motion.div>

      {/* ─── Collection Filters + Search/Sort Toolbar ─── */}
      {books.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Collection chips row */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
            <CollectionChip
              label="All Collections"
              count={books.length}
              active={!activeCollection}
              onClick={() => setActiveCollection(null)}
            />
            {collections.map((col) => (
              <CollectionChip
                key={col.id}
                collection={col}
                count={col.bookIds?.length || 0}
                active={activeCollection === col.id}
                onClick={() =>
                  setActiveCollection(activeCollection === col.id ? null : col.id)
                }
              />
            ))}
            <button
              onClick={() => setShowCreateCollection(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-dashed border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary transition-all cursor-pointer whitespace-nowrap bg-primary/5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Cultivate
            </button>
          </div>

          {/* Search + Sort + View toggle */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search your library..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-10 rounded-2xl glass border-border/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sort */}
              <div className="relative flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="w-full h-11 px-5 rounded-2xl glass border-border/40 gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-white dark:hover:bg-primary/5 shadow-sm"
                >
                  <SortAsc className="w-4 h-4 text-primary/60" />
                  <span>
                    {sortOptions.find((s) => s.value === sort)?.label}
                  </span>
                </Button>
              <AnimatePresence>
                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl glass border-border/40 shadow-2xl p-1.5 overflow-hidden animate-fade-in"
                    >
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSort(opt.value);
                            setShowSortMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer",
                            sort === opt.value
                              ? "bg-primary text-white"
                              : "text-foreground/70 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

              {/* View Toggle */}
              <div className="flex items-center glass border-border/40 rounded-2xl overflow-hidden p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    viewMode === "list"
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Books Grid / List ─── */}
      {filteredBooks.length > 0 ? (
        <motion.section
          key={`${viewMode}-${activeCollection}-${sort}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <h2 className="text-xl font-serif font-bold text-foreground/90">
                {activeCollection
                  ? collections.find((c) => c.id === activeCollection)?.name || "Collection"
                  : "Sanctuary Archives"}
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 tabular-nums">
              {filteredBooks.length} VOLUME{filteredBooks.length !== 1 ? "S" : ""}
            </span>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredBooks.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={i}
                  onDetails={() => openBookDetail(book)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBooks.map((book, i) => (
                <BookCardList
                  key={book.id}
                  book={book}
                  index={i}
                  onDetails={() => openBookDetail(book)}
                />
              ))}
            </div>
          )}
        </motion.section>
      ) : books.length > 0 ? (
        /* No results from filter/search */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg font-semibold mb-1">No books found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {search
              ? `No results for "${search}". Try a different search.`
              : "This collection is empty. Add books from your library!"}
          </p>
        </motion.div>
      ) : (
        /* True empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-vault-brass/10 flex items-center justify-center mb-6">
            <Plus className="w-8 h-8 text-vault-brass/40" strokeWidth={1} />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">
            Begin Your Collection
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm font-serif italic">
            Acquire an EPUB or PDF volume above, or explore the{" "}
            <a href="/discover" className="text-primary hover:underline font-bold">
              Archives
            </a>{" "}
            to discover free classics.
          </p>
        </motion.div>
      )}

      {/* ─── Modals ─── */}
      <BookDetailModal
        book={detailBook}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailBook(null);
        }}
        onUpdate={handleUpdateBook}
        onDelete={handleDeleteBook}
        collections={collections}
        onToggleCollection={handleToggleCollection}
      />

      <CreateCollectionDialog
        open={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onSubmit={handleCreateCollection}
      />
    </div>
    </div>
  );
}
