"use client";


import { useEffect, useRef, useState, useCallback } from "react";
import { BookX, Loader2 } from "lucide-react";
import { useReader } from "./reader-context";
import { cn } from "@/lib/utils";

interface PdfReaderProps {
  url: string;
  initialPage?: number;
}

export function UltraPdfReader({ url, initialPage = 1 }: PdfReaderProps) {
  const { settings, navigation, setMeta, setLocation, location: contextLocation } = useReader();
  
  // State
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const renderingRef = useRef(false);

  // Navigation helpers
  const goNext = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  }, [currentPage, totalPages]);

  const goPrev = useCallback(() => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  }, [currentPage]);

  // Observe container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
        if (entries[0] && entries[0].contentRect.width > 0) {
            setContainerWidth(entries[0].contentRect.width);
        }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load PDF
  useEffect(() => {
    if (!url || url.trim() === "") {
      setError("This book doesn't have a downloadable file yet.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(Math.min(initialPage, doc.numPages));
        
        setMeta({
            totalPages: doc.numPages,
            currentPage: Math.min(initialPage, doc.numPages),
            progress: (Math.min(initialPage, doc.numPages) / doc.numPages) * 100
        });

        setLoading(false);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError("Failed to open this PDF.");
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [url, initialPage, setMeta]);

  // Render page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current || containerWidth === 0) return;

    renderingRef.current = true;
    try {
      const page = await pdfDoc.getPage(pageNum);
      
      // Calculate scale to fit width
      const unscaledViewport = page.getViewport({ scale: 1 });
      const padding = 32; // 16px padding on each side
      const targetWidth = Math.min(containerWidth - padding, 800); // Max width 800px
      const scale = targetWidth / unscaledViewport.width;
      
      const viewport = page.getViewport({ scale });
      const devicePixelRatio = window.devicePixelRatio || 1;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Handle Retina displays
      canvas.width = viewport.width * devicePixelRatio;
      canvas.height = viewport.height * devicePixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(devicePixelRatio, devicePixelRatio);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (e) {
      console.error("Render error", e);
    } finally {
      renderingRef.current = false;
      if (totalPages > 0) {
        setMeta({ currentPage: pageNum, progress: (pageNum / totalPages) * 100 });
        setLocation({ 
            cfi: String(pageNum), 
            percentage: (pageNum / totalPages) * 100,
            currentPage: pageNum
        });
      }
    }
  }, [pdfDoc, containerWidth, totalPages, setMeta, setLocation]);

  useEffect(() => {
    if (pdfDoc && currentPage && containerWidth > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, containerWidth, renderPage]);

  // Handle Navigation
  useEffect(() => {
    if (!navigation || totalPages === 0) return;
    if (navigation.type === "percentage") {
      const targetPage = Math.max(1, Math.round(Number(navigation.value) * totalPages));
      setCurrentPage(targetPage);
    } else if (navigation.type === "chapter") {
      if (navigation.value === "next") goNext();
      else if (navigation.value === "prev") goPrev();
    } else if (navigation.type === "cfi") {
      const page = parseInt(String(navigation.value), 10);
      if (!isNaN(page)) setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    }
  }, [navigation, totalPages, goNext, goPrev]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <BookX className="w-10 h-10 text-destructive/50" />
          <div>
            <h3 className="font-serif text-lg font-semibold mb-1">Cannot Open Book</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col items-center overflow-auto">

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-50 backdrop-blur-md">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40 mb-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">Opening Vault...</span>
        </div>
      )}

      <div 
         ref={containerRef}
         className="flex-1 flex items-start justify-center overflow-y-auto w-full h-full relative z-20"
      >
        <canvas 
          ref={canvasRef} 
          className={cn(
            "shadow-lg max-w-full transition-all duration-700 mt-20 mb-32",
            settings.theme === "sepia-silk" && "sepia-[0.3] brightness-[0.9] contrast-[1.1]",
            settings.theme === "obsidian" && "invert-[0.9] hue-rotate-180 brightness-[0.8] contrast-[1.2]",
            settings.theme === "slate" && "invert-[0.85] hue-rotate-180 brightness-[0.7] contrast-[1.1]",
            settings.theme === "paper" && "sepia-[0.2] brightness-[0.95]"
          )}
        />
      </div>

      <div className="absolute inset-0 flex pointer-events-none z-30">
        <div onClick={goPrev} className="w-[15%] h-full pointer-events-auto cursor-w-resize" />
        <div className="flex-1" />
        <div onClick={goNext} className="w-[15%] h-full pointer-events-auto cursor-e-resize" />
      </div>
    </div>
  );
}
