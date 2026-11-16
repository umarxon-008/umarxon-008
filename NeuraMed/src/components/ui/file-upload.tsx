"use client";

import { useT } from "@/i18n/client";
import { useRef, useState } from "react";
import { Upload, FileText, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}

export function FileUpload({
  onFileSelect,
  accept = "application/pdf,image/jpeg,image/png",
  maxSizeMB = 10,
  className,
  label = "Fayl yuklash",
  sublabel = "PDF, JPG, PNG — maksimal 10 MB",
}: FileUploadProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(t("Fayl hajmi {n} MB dan oshmasin", { n: maxSizeMB }));
      return;
    }
    setSelected(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const clear = () => {
    setSelected(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (selected) {
    const isImage = selected.type.startsWith("image/");
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800", className)}>
        {isImage ? (
          <Image className="h-8 w-8 text-primary-500 shrink-0" />
        ) : (
          <FileText className="h-8 w-8 text-primary-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{selected.name}</p>
          <p className="text-xs text-slate-500">{(selected.size / 1024 / 1024).toFixed(2)} {t("MB")}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={clear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-slate-200 dark:border-slate-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Upload className="h-7 w-7 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(label)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t(sublabel)}</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
