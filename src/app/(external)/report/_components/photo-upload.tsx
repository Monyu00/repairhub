"use client";

import { type ChangeEvent, useRef, useState } from "react";

import Image from "next/image";

import { UploadIcon, XIcon } from "lucide-react";

import { compressImage } from "@/lib/utils/compress-image";

interface PhotoUploadProps {
  maxPhotos?: number;
  maxFileSizeMB?: number;
}

export function PhotoUpload({ maxPhotos = 3, maxFileSizeMB = 5 }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    if (photos.length + files.length > maxPhotos) {
      setError(`最多只能上傳 ${maxPhotos} 張圖片`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

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

      setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos));
    } catch (err) {
      console.error("Compression error:", err);
      setError("圖片壓縮處理失敗，請重試");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div
            key={photo.slice(0, 32)}
            className="group relative aspect-square rounded-lg border border-border bg-muted overflow-hidden"
          >
            <Image src={photo} alt={`預覽圖片 ${i + 1}`} fill className="object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs hover:bg-destructive hover:text-destructive-foreground transition-colors"
              aria-label="移除圖片"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <UploadIcon className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium">上傳照片</span>
                <span className="text-[10px] text-muted-foreground">
                  ({photos.length}/{maxPhotos})
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">支援 JPG、PNG 格式，每張最大 5MB，最多 {maxPhotos} 張照片。</p>
    </div>
  );
}
