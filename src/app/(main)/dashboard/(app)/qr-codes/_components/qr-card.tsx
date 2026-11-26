"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { Check, Copy, Download, ExternalLink, QrCode, Wrench } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { downloadCardImage } from "./qr-pdf-export";
import type { PrintableQRItem } from "./types";

interface QRCardProps {
  item: PrintableQRItem;
}

const qrDataUrlCache = new Map<string, string>();

export function QRCard({ item }: QRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>(() => qrDataUrlCache.get(item.url) ?? "");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const cachedDataUrl = qrDataUrlCache.get(item.url);
    if (cachedDataUrl !== undefined) {
      setQrDataUrl(cachedDataUrl);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(item.url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        qrDataUrlCache.set(item.url, url);
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR Code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [item.url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      toast.success("已複製報修連結至剪貼簿");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("複製失敗，請手動複製");
    }
  };

  const handleDownloadSingle = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadCardImage(item);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="group border-border bg-card text-card-foreground relative flex flex-col items-center justify-between overflow-hidden border p-4 shadow-xs transition-shadow hover:shadow-md">
      {/* Screen action bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyLink}
                className="bg-background/80 hover:bg-muted size-7 rounded-md backdrop-blur-xs"
                aria-label="複製報修連結"
              >
                {copied ? <Check className="text-success-text size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">複製報修連結</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleDownloadSingle}
                disabled={isDownloading}
                className="bg-background/80 hover:bg-muted size-7 rounded-md backdrop-blur-xs"
                aria-label="下載卡片圖片"
              >
                <Download className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">下載卡片圖片 (PNG)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                asChild
                className="bg-background/80 hover:bg-muted size-7 rounded-md backdrop-blur-xs"
                aria-label="開啟報修頁面"
              >
                <a href={item.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">開啟報修頁面</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Top Header / Branding */}
      <div className="border-border/60 flex w-full items-center justify-between border-b pr-24 pb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-md">
            <Wrench className="size-3" />
          </div>
          <span className="font-heading text-xs font-semibold tracking-tight">南臺維修通報</span>
        </div>
        <Badge variant={item.type === "space" ? "secondary" : "outline"}>
          {item.type === "space" ? "空間 QR" : "設備 QR"}
        </Badge>
      </div>

      {/* Center QR Code Image */}
      <div className="ring-border/50 my-3 flex items-center justify-center rounded-lg bg-white p-2 shadow-xs ring-1">
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt={`QR Code for ${item.title}`}
            width={160}
            height={160}
            unoptimized
            className="size-36 object-contain sm:size-40"
          />
        ) : (
          <div className="bg-muted/40 text-muted-foreground flex size-36 items-center justify-center sm:size-40">
            <QrCode className="size-8 animate-pulse opacity-40" />
          </div>
        )}
      </div>

      {/* Card Info & Labels */}
      <div className="w-full space-y-1 text-center">
        <h3 className="font-heading text-foreground truncate text-base font-bold tracking-tight">{item.title}</h3>
        <p className="text-muted-foreground truncate text-xs">{item.subtitle}</p>
        {item.code && <p className="text-foreground/80 font-mono text-xs">編號: {item.code}</p>}
      </div>

      {/* Card Footer notice */}
      <div className="border-border/70 bg-muted/30 text-muted-foreground mt-2.5 w-full rounded-md border border-dashed py-1 text-center text-xs">
        手機掃描 QR Code 立即通報修繕
      </div>
    </Card>
  );
}
