"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

export function UploadZone({ onUpload, className }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setFileName(file.name);
      setUploading(true);
      setUploadProgress(0);
      setDone(false);

      try {
        await onUpload(file);
        setUploadProgress(100);
        setDone(true);
        setTimeout(() => {
          setUploading(false);
          setDone(false);
          setUploadProgress(0);
        }, 2000);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/epub+zip": [".epub"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <>
      {/* Backdrop blur when dragging */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div
        {...getRootProps()}
        className={cn(
          "relative z-50 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer",
          isDragActive
            ? "border-vault-brass bg-vault-brass/5 scale-[1.02]"
            : "border-border/60 hover:border-vault-brass/50 hover:bg-secondary/30",
          uploading ? "opacity-60 pointer-events-none" : "hover:shadow-lg hover:shadow-vault-brass/5",
          className
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            {uploading ? (
              <div className="w-12 h-12 rounded-full border-2 border-vault-brass/20 border-t-vault-brass animate-spin" />
            ) : (
              <motion.div
                animate={isDragActive ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                  isDragActive ? "bg-vault-brass/15" : "bg-secondary"
                )}
              >
                <Plus 
                  className={cn(
                    "w-7 h-7 transition-colors",
                    isDragActive ? "text-vault-brass" : "text-muted-foreground"
                  )} 
                  strokeWidth={1.5} 
                />
              </motion.div>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-2 w-full max-w-xs"
              >
                <p className="text-sm font-medium truncate max-w-full">
                  {done ? "Successfully Added" : fileName}
                </p>
                <Progress value={uploadProgress} className="h-1 w-full bg-vault-brass/10" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {done ? "Cataloged in Archives" : "Inducting into Vault..."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-center">
                  <p className="text-sm font-serif font-semibold">
                    {isDragActive ? "Drop to induct volume" : "Induct New Volume"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                    Drag and drop your manuscript here
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
