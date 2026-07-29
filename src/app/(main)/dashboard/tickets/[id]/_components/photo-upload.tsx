"use client";

import { useRef, useState } from "react";

import { ImagePlus, X } from "lucide-react";

interface PhotoUploadProps {
  photos: string[]; // base64 strings
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoUpload({ photos, onChange, maxPhotos = 3, disabled = false }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("僅支援圖片檔案格式 (JPG, PNG, WebP)"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error("讀取圖片失敗"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`最多只能上傳 ${maxPhotos} 張照片`);
      return;
    }

    try {
      const newPhotosPromises = files.map(processFile);
      const newPhotos = await Promise.all(newPhotosPromises);
      onChange([...photos, ...newPhotos]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("處理圖片時發生未知錯誤");
      }
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    setError(null);
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((src, index) => (
          <div
            key={`${src.slice(0, 20)}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`完工照片預覽 #${index + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                aria-label="移除照片"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}

        {photos.length < maxPhotos && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-border border-dashed bg-muted/30 p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImagePlus className="size-5 text-muted-foreground/80" />
            <span className="font-medium text-xs">上傳照片</span>
            <span className="text-[10px] text-muted-foreground/70">
              ({photos.length}/{maxPhotos})
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {error && <p className="font-medium text-destructive text-xs">{error}</p>}
    </div>
  );
}
