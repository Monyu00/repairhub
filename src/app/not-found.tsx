"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">找不到頁面</h1>
      <p className="text-muted-foreground">您要找的頁面不存在，或連結可能已失效。</p>
      <Link prefetch={false} replace href="/dashboard">
        <Button variant="outline">返回首頁</Button>
      </Link>
    </div>
  );
}
