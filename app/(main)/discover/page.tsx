"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { addBookToLibrary } from "@/lib/db";
import {
  searchBooks,
  getTrendingBooks,
  DISCOVER_TOPICS,
  type StoreBook,
  type TopicKey,
} from "@/lib/gutendex";
import { StoreBookCard } from "@/components/store/store-book-card";
import { BookPreviewModal } from "@/components/store/book-preview-modal";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, X, Loader2, Sparkles, BookOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ─── State ──────────────────────────────────────────────────────────────
  const [books, setBooks] = useState<StoreBook[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [activeTopic, setActiveTopic] = useState<TopicKey | "search">("best_books");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Visual Search State
  const [previewResults, setPreviewResults] = useState<StoreBook[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [previewBook, setPreviewBook] = useState<StoreBook | null>(null);
  const [addingKeys, setAddingKeys] = useState<Set<string>>(new Set());
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const loadBooks = useCallback(async (reset = false) => {
    if (!reset && !hasMore) return;
    
    setIsLoading(true);
    try {
      const nextPage = reset ? 1 : page + 1;
      let newBooks: StoreBook[] = [];

      if (activeTopic === "search" && searchQuery) {
         newBooks = await searchBooks(searchQuery, nextPage);
      } else if (activeTopic !== "search") {
          const topicParam = activeTopic === "best_books" ? undefined : activeTopic;
          newBooks = await getTrendingBooks(topicParam, nextPage); 
      }

      if (reset) {
        setBooks(newBooks);
        setPage(1);
      } else {
        setBooks(prev => {
            const existing = new Set(prev.map(b => b.key));
            const filtered = newBooks.filter(b => !existing.has(b.key));
            return [...prev, ...filtered];
        });
        setPage(nextPage);
      }
      
      if (newBooks.length === 0) {
        setHasMore(false);
      }
      
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTopic, searchQuery, page, hasMore]);


  // ─── Effect: Topic Change (Non-Search) ──────────────────────────────────
  useEffect(() => {
    if (activeTopic !== "search") {
        setHasMore(true);
        loadBooks(true);
    }
  }, [activeTopic]);


  // ─── Infinite Scroll ───────────────────────────────────────────────────
  const loadMoreRef = useInfiniteScroll(() => {
     if (!isLoading && hasMore) loadBooks(false);
  });

  // ─── Click Outside to Close Dropdown ───────────────────────────────────
  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setShowDropdown(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // ─── Visual Search Logic ───────────────────────────────────────────────
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setPreviewResults([]);
      setShowDropdown(false);
      if (activeTopic === "search") setActiveTopic("best_books");
      return;
    }

    setIsPreviewLoading(true);
    setShowDropdown(true);
    
    debounceRef.current = setTimeout(async () => {
        try {
            const results = await searchBooks(query, 1);
            setPreviewResults(results.slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setIsPreviewLoading(false);
        }
    }, 300);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      setShowDropdown(false);
      if (!searchQuery.trim()) return;
      
      setActiveTopic("search");
      setHasMore(true);
      setIsLoading(true);
      
      setPage(1);
      setBooks([]);
      
      searchBooks(searchQuery, 1).then(newBooks => {
          setBooks(newBooks);
          setHasMore(newBooks.length > 0);
          setIsLoading(false);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showDropdown || previewResults.length === 0) return;

      if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev < previewResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
           e.preventDefault();
           setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
          e.preventDefault();
          if (selectedIndex >= 0) {
              const book = previewResults[selectedIndex];
              setPreviewBook(book);
              setShowDropdown(false);
          } else {
              handleSearchSubmit();
          }
      } else if (e.key === "Escape") {
          setShowDropdown(false);
      }
  };


  // ─── Add to library ────────────────────────────────────────────────────
  async function handleAdd(book: StoreBook) {
    if (!user) return;
    setAddingKeys((s) => new Set(s).add(book.key));

    try {
      const downloadUrl = book.formats["application/epub+zip"];

      if (!downloadUrl) {
        toast.error(`"${book.title}" isn't available in EPUB format`);
        return;
      }

      await addBookToLibrary(user.id, {
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        fileUrl: downloadUrl,
        fileType: "epub",
        fileSize: 0,
        source: "store",
        storeBookId: book.key,
      });
      toast.success(`${book.title} added to library`);
      setAddedKeys((s) => new Set(s).add(book.key));
    } catch (error) {
      console.error("Failed to add book:", error);
      toast.error("Failed to add book");
    } finally {
      setAddingKeys((s) => {
        const next = new Set(s);
        next.delete(book.key);
        return next;
      });
    }
  }

  const activeLabel = activeTopic === "search" 
    ? `Resonating with "${searchQuery}"`
    : DISCOVER_TOPICS.find((s) => s.key === activeTopic)?.label ?? "Curated Selection";

  return (
    <div className="space-y-16 pb-32">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-10"
      >
        <div className="space-y-2">
          <h1 className="font-serif text-6xl font-bold tracking-ultra-tight text-foreground/90">
            Discover
          </h1>
          <p className="font-serif text-xl italic text-muted-foreground/60 max-w-xl">
            uncover the next chapter in your journey through our curated archives.
          </p>
        </div>

        <div className="relative max-w-3xl z-40" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              {isPreviewLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Search className="w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
              )}
            </div>
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={handleSearchInput}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
              className="w-full h-16 pl-16 pr-14 rounded-2xl glass border-border/40 text-lg placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all shadow-xl shadow-black/5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPreviewResults([]);
                  setShowDropdown(false);
                  if (activeTopic === "search") setActiveTopic("best_books");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>

          {/* Visual Search Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="absolute top-full left-0 right-0 mt-3 glass border-border/40 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col p-2"
              >
                {previewResults.length > 0 ? (
                  <>
                    <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                      Top Resonances
                    </div>
                    {previewResults.map((book, index) => (
                      <button
                        key={book.key}
                        onClick={() => {
                          setPreviewBook(book);
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 px-3 py-3 rounded-xl text-left transition-all",
                          index === selectedIndex ? "bg-primary/10" : "hover:bg-primary/5"
                        )}
                      >
                        <div className="relative w-10 h-14 shrink-0 rounded-lg bg-muted overflow-hidden shadow-sm border border-border/20">
                          {book.coverUrl && (
                            <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-bold text-sm text-foreground/90 truncate">{book.title}</h4>
                          <p className="text-xs text-muted-foreground/60 truncate italic">{book.author}</p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-border/20 mt-2 pt-2">
                      <button
                        onClick={() => handleSearchSubmit()}
                        className="w-full py-3 text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        Explore all outcomes for "{searchQuery}"
                      </button>
                    </div>
                  </>
                ) : !isPreviewLoading && (
                  <div className="p-8 text-center space-y-4">
                    <p className="text-sm text-muted-foreground/50 italic">No exact echoes found.</p>
                    <button 
                      onClick={() => router.push('/library')}
                      className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      Upload your own volume
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Topics / Domains */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Cerebral Domains</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {DISCOVER_TOPICS.map((topic) => (
            <button
              key={topic.key}
              onClick={() => setActiveTopic(topic.key as TopicKey)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all duration-500 border relative group",
                activeTopic === topic.key
                  ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 -translate-y-1"
                  : "bg-white dark:bg-card/50 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <span className="text-base group-hover:scale-110 transition-transform duration-300">{topic.emoji}</span>
              {topic.label}
              {activeTopic === topic.key && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <section className="min-h-[600px] space-y-10">
        <div className="flex items-center justify-between border-b border-border/40 pb-6">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <h2 className="font-serif text-4xl font-bold text-foreground/90">
                {activeLabel}
             </h2>
             {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 tabular-nums bg-secondary/80 px-4 py-2 rounded-full border border-border/40">
              {books.length} VOLUMES
          </span>
        </div>

        {books.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center glass rounded-3xl border-border/40 max-w-4xl mx-auto">
            <div className="bg-primary/5 p-8 rounded-full mb-8">
              <Compass className="w-16 h-16 text-primary/30" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-foreground/80 mb-3">No readable echoes found</h3>
            <p className="text-base italic max-w-md opacity-60 mb-8 text-muted-foreground">
              Your search yielded no free volumes in our curated archive. Try a broader term, or expand your personal library.
            </p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/library')}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload to Library
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 md:gap-10">
            <AnimatePresence mode="popLayout">
              {books.map((book, i) => (
                <StoreBookCard
                  key={`${book.key}-${i}`}
                  book={book}
                  index={i}
                  onPreview={() => setPreviewBook(book)}
                  onAdd={() => handleAdd(book)}
                  adding={addingKeys.has(book.key)}
                  added={addedKeys.has(book.key)}
                />
              ))}
            </AnimatePresence>
            
            {hasMore && (
              <div ref={loadMoreRef} className="col-span-full py-20 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Expanding horizons...</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Preview Modal */}
      <BookPreviewModal
        book={previewBook}
        open={!!previewBook}
        onClose={() => setPreviewBook(null)}
        onAdd={() => previewBook && handleAdd(previewBook)}
        adding={previewBook ? addingKeys.has(previewBook.key) : false}
        added={previewBook ? addedKeys.has(previewBook.key) : false}
      />
    </div>
  );
}
