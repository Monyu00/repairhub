"use client";

import { useRef, useState } from "react";

import Image from "next/image";

import { ImagePlus, X } from "lucide-react";

import { DEFAULT_MAX_PHOTOS, MAX_RAW_PHOTO_SIZE_MB } from "@/lib/storage/constants";
import { compressImage } from "@/lib/utils/compress-image";

interface PhotoUploadProps {
  photos: string[]; // base64 strings
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  maxFileSizeMB?: number;
  disabled?: boolean;
}

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  maxFileSizeMB = MAX_RAW_PHOTO_SIZE_MB,
  disabled = false,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`最多只能上傳 ${maxPhotos} 張照片`);
      e.target.value = "";
      return;
    }

    setLoading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of files) {
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          setError(`圖片「${file.name}」超過 ${maxFileSizeMB}MB 限制`);
          continue;
        }

        if (!file.type.startsWith("image/")) {
          setError(`檔案「${file.name}」不是有效的圖片格式`);
          continue;
        }

        const compressed = await compressImage(file);
        newPhotos.push(compressed.base64);
      }

      onChange([...photos, ...newPhotos].slice(0, maxPhotos));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("處理圖片時發生未知錯誤");
      }
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (index: number) => {
    setError(null);
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const isUploadDisabled = disabled ? true : loading;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((src, index) => (
          <div
            key={src.slice(-32)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            <Image src={src} alt={`完工照片預覽 #${index + 1}`} fill className="object-cover" />
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
            disabled={isUploadDisabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-border border-dashed bg-muted/30 p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <ImagePlus className="size-5 text-muted-foreground/80" />
                <span className="font-medium text-xs">上傳照片</span>
                <span className="text-[10px] text-muted-foreground/70">
                  ({photos.length}/{maxPhotos})
                </span>
              </>
            )}
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
        disabled={isUploadDisabled}
      />

      {error && <p className="font-medium text-destructive text-xs">{error}</p>}
      <p className="text-muted-foreground text-xs">支援 JPG、PNG、WebP 格式，每張最大 5MB，最多 {maxPhotos} 張照片。</p>
    </div>
  );
}
