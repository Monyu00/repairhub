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

import type { PrintableQRItem } from "./types";

interface QRCardProps {
  item: PrintableQRItem;
}

export function QRCard({ item }: QRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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

  const handleDownloadSingle = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const sanitizedTitle = item.title.replace(/[\s/\\:*?"<>|]/g, "_");
    a.download = `QR_${item.type}_${sanitizedTitle}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`已下載 ${item.title} QR Code`);
  };

  return (
    <Card className="group relative flex flex-col items-center justify-between overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-xs transition-all hover:shadow-md">
      {/* Screen action bar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyLink}
                className="size-7 rounded-md bg-background/80 backdrop-blur-xs hover:bg-muted"
                aria-label="複製報修連結"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
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
                className="size-7 rounded-md bg-background/80 backdrop-blur-xs hover:bg-muted"
                aria-label="下載單張 PNG"
              >
                <Download className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">下載單張 PNG</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                asChild
                className="size-7 rounded-md bg-background/80 backdrop-blur-xs hover:bg-muted"
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
      <div className="flex w-full items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="size-3" />
          </div>
          <span className="font-heading font-semibold text-xs tracking-tight">RepairHub 報修</span>
        </div>
        <Badge
          variant={item.type === "space" ? "secondary" : "outline"}
          className="px-1.5 py-0 text-[10px] font-normal"
        >
          {item.type === "space" ? "空間 QR" : "設備 QR"}
        </Badge>
      </div>

      {/* Center QR Code Image */}
      <div className="my-3 flex items-center justify-center rounded-lg bg-white p-2 shadow-xs ring-1 ring-border/50">
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
          <div className="flex size-36 items-center justify-center bg-muted/40 text-muted-foreground sm:size-40">
            <QrCode className="size-8 animate-pulse opacity-40" />
          </div>
        )}
      </div>

      {/* Card Info & Labels */}
      <div className="w-full space-y-1 text-center">
        <h4 className="truncate font-heading font-bold text-base text-foreground tracking-tight">{item.title}</h4>
        <p className="truncate text-muted-foreground text-xs">{item.subtitle}</p>
        {item.code && <p className="font-mono text-[11px] text-muted-foreground/80">編號: {item.code}</p>}
      </div>

      {/* Card Footer notice */}
      <div className="mt-2.5 w-full rounded-md border border-dashed border-border/70 bg-muted/30 py-1 text-center text-[10px] text-muted-foreground">
        手機掃描 QR Code 立即通報修繕
      </div>
    </Card>
  );
}
