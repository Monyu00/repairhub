"use client";

import { useState } from "react";

import Image from "next/image";

import { ImageIcon, XIcon } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Photo {
  id: string;
  storage_path: string;
  phase: "report" | "closure";
}

interface TicketPhotosGalleryProps {
  photos: Photo[];
  supabaseUrl: string;
  phase: "report" | "closure";
  title: string;
}

function getPublicUrl(supabaseUrl: string, storagePath: string) {
  const base = supabaseUrl.replace(/\/+$/, "");
  const path = storagePath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/ticket-photos/${path}`;
}

export function TicketPhotosGallery({ photos, supabaseUrl, phase, title }: TicketPhotosGalleryProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const phasePhotos = photos.filter((p) => p.phase === phase);

  if (phasePhotos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="size-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-sm">{title}</h2>
        <span className="text-muted-foreground text-xs">（{phasePhotos.length} 張）</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {phasePhotos.map((photo) => {
          const url = getPublicUrl(supabaseUrl, photo.storage_path);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxSrc(url)}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="點擊放大照片"
            >
              <Image src={url} alt="報修照片" fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-2xl border-0 bg-black/90 p-2">
          <DialogTitle className="sr-only">照片預覽</DialogTitle>
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            aria-label="關閉"
          >
            <XIcon className="size-4" />
          </button>
          {lightboxSrc && (
            <div className="relative aspect-video w-full">
              <Image
                src={lightboxSrc}
                alt="放大照片"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
