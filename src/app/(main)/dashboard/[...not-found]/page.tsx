"use client";

export default function DashboardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">找不到頁面</h1>
      <p className="text-muted-foreground">這個頁面尚未建立，或連結可能已失效。</p>
    </div>
  );
}
