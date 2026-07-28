"use client";

import { useState } from "react";

import { ImageIcon, XIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface PhotoItem {
  id: string;
  storagePath: string;
  phase: "report" | "closure";
}

interface TicketPhotosSectionProps {
  photos: PhotoItem[];
  supabaseUrl: string;
  phase: "report" | "closure";
  title: string;
}

function getPublicUrl(supabaseUrl: string, storagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/ticket-photos/${storagePath}`;
}

export function TicketPhotosSection({ photos, supabaseUrl, phase, title }: TicketPhotosSectionProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const phasePhotos = photos.filter((p) => p.phase === phase);

  if (phasePhotos.length === 0) return null;

  return (
    <Card className="shadow-2xs">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          <ImageIcon className="size-4 text-primary" />
          {title}
          <span className="font-normal text-muted-foreground text-xs">（{phasePhotos.length} 張）</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {phasePhotos.map((photo) => {
            const url = getPublicUrl(supabaseUrl, photo.storagePath);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxSrc(url)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="點擊放大照片"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            );
          })}
        </div>

        <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
          <DialogContent className="max-w-3xl border-0 bg-black/90 p-2">
            <DialogTitle className="sr-only">照片預覽</DialogTitle>
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
              aria-label="關閉"
            >
              <XIcon className="size-4" />
            </button>
            {lightboxSrc && (
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxSrc}
                  alt="放大照片"
                  className="max-h-[80vh] w-auto max-w-full rounded object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
