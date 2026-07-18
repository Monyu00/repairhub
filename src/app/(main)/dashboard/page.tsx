import { Wrench } from "lucide-react";

export default function Page() {
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center p-4">
      {/* Subtle decorative glow elements */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl border border-border/40 bg-card/45 p-8 text-center shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-border/80 md:p-12">
        {/* Animated icon container */}
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/5 opacity-75" />
          <Wrench className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-transparent">
            校園維修通報系統
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            歡迎使用 RepairHub。這是一個乾淨、高效的儀表板外殼。請開始建立與維修通報相關的功能模組。
          </p>
        </div>

        <div className="mt-8 w-full border-t border-border/30 pt-6">
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>系統就緒：等待模組部署</span>
          </div>
        </div>
      </div>
    </div>
  );
}
