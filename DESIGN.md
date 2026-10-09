---
name: RepairHub
description: 現代化、透明高效的校園設施報修與資產履歷管理系統
colors:
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  sidebar: "oklch(0.985 0 0)"
  sidebar-foreground: "oklch(0.145 0 0)"
  sidebar-primary: "oklch(0.205 0 0)"
  sidebar-primary-foreground: "oklch(0.985 0 0)"
  sidebar-border: "oklch(0.922 0 0)"
typography:
  display:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "oklch(0.205 0 0 / 80%)"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    height: "20px"
---

# Design System: RepairHub

## Overview

**Creative North Star: "The Transparent Ledger"**

RepairHub（透明維修公約）是專為現代校園打造的設施報修、資產履歷與修繕調度管理系統。系統以「公共信任」、「透明閉環」與「精準可讀性」為核心美學基調，屏除花俏繁複的漸層裝飾，以純淨高對比的版面建構出如工程公約與精密手冊般的專業權威感。

整體視覺風格呈現沉穩精準的現代工藝質感：介面以深沉碳墨（Carbon Ink）與極簡紙白（Paper White）形成堅實的閱讀基底，輔以高辨識度的信號赤紅（Signal Crimson）標註緊急與異常狀態。在空間布局上，系統兼顧雙軌操作實境——現場行動端（Reporter 與 Technician）講求 10 秒通報的零阻力直覺流程，而總務調度桌面端（Admin）則維持俐落、高資訊密度且結構緊密的儀表板節奏。

**Key Characteristics:**
- **極簡透明 (Radical Transparency)**：全域工單狀態流轉與歷史進程清晰呈現在高對比排版中，杜絕資訊黑盒。
- **精密手感 (Precise & Tactile Feedback)**：全域組件維持緊湊高度（32px）、細緻點擊下壓微動效（1px 物理下沉）與清晰輪廓聚焦環。
- **語意 Token 統一 (Semantic-First Architecture)**：嚴格依循 shadcn `radix-nova` 語意變數，保證深淺色模式與主題預設檔（Default / Tangerine / Soft Pop / Brutalist）無縫切換。
- **結構區隔取代厚重陰影 (Tonal Rings over Blurry Shadows)**：採用 1px 微外框（`ring-1 ring-foreground/10`）與階調底色區隔層次，維持介面清晰俐落。

## Colors

以極簡純白與工程碳墨構成高對比公約基調，僅以信號赤紅作為狀態導引。

### Primary
- **Carbon Ink (碳素墨黑)** (`oklch(0.205 0 0)` / Dark: `oklch(0.922 0 0)`): 主要按鈕、重要標題、活動狀態指示，象徵系統的嚴謹與客觀可信度。

### Neutral
- **Pure Paper White (基底紙白)** (`oklch(1 0 0)` / Dark: `oklch(0.145 0 0)`): 畫布背景與浮層表面，提供極度純淨的閱讀畫布。
- **Slate Ink Text (墨色內文)** (`oklch(0.145 0 0)` / Dark: `oklch(0.985 0 0)`): 高對比的主內文與標籤文本。
- **Muted Dust (次要淺灰)** (`oklch(0.97 0 0)` / Dark: `oklch(0.269 0 0)`): 次級容器底色、次要按鈕背景與 hover 狀態微反饋。
- **Technical Slate (輔助灰階)** (`oklch(0.556 0 0)` / Dark: `oklch(0.708 0 0)`): 次要描述、欄位說明文字與工單時間戳記。
- **Hairline Border (規律細線)** (`oklch(0.922 0 0)` / Dark: `oklch(1 0 0 / 10%)`): 分割線、表單外框與元件結構輪廓。

### Destructive
- **Signal Crimson (信號赤紅)** (`oklch(0.577 0.245 27.325)` / Dark: `oklch(0.704 0.191 22.216)`): 緊急通報、設備停機故障、退件重開單及危險刪除動作。

### Named Rules
**The Ink and Signal Rule.** 全站介面除基礎灰階階調外，飽和彩色僅限於明確的工單狀態指示（如信號赤紅代表緊急/故障），嚴禁在非狀態性元件上添加裝飾性彩色背景。

**The Zero-Hardcode Rule.** 所有顏色必須使用 Tailwind 語意化類別或 CSS 變數（如 `bg-primary`, `text-muted-foreground`, `border-border`），嚴禁寫死任意十六進位色碼或非主題顏色。

## Typography

**Display Font:** Geist (`var(--font-geist)`, fallback system-ui, sans-serif)
**Body Font:** Geist (`var(--font-geist)`, fallback system-ui, sans-serif)
**Label/Mono Font:** Geist Mono (`var(--font-geist-mono)`, fallback monospace)

**Character:** 現代俐落的無襯線字型 Geist 搭配高辨識度的 Geist Mono，展現工程工具的嚴謹度與易讀性。系統支援透過 `data-font` 屬性動態掛載 18 種字體族群。

### Hierarchy
- **Display** (800 Extrabold, 1.875rem / 30px, line-height 2.25rem): 全站首頁 Hero 標題與重要宣傳看板。
- **Headline** (700 Bold, 1.5rem / 24px, line-height 2rem): 模組頁面標題（如「管理後台」、「報修單管理」）與主要彈窗抬頭。
- **Title** (600 SemiBold, 1rem / 16px, line-height 1.5rem): 卡片標題、表頭欄位名稱、快速導航區塊標題。
- **Body** (400 Regular, 0.875rem / 14px, line-height 1.25rem): 標準說明內文、表格資料列、表單輸入內容。
- **Label** (500 Medium, 0.75rem / 12px, line-height 1rem): 狀態膠囊 Badge、輔助詮釋文字、時間戳記。

### Named Rules
**The Numeric Alignment Rule.** 所有工單編號（Ticket Code）、建築空間代碼（Location Code）、金額數字與時間戳記一律使用等寬數字或 Mono 字體，確保表格跨列垂直對齊與掃讀精確度。

## Layout

系統採用以 4px 為單位的標準空間網格（Tailwind CSS v4 語意間距）。

- **版面容器 (Container):** 桌面端採用標準置中容器，最大寬度 1280px (`max-w-7xl`)，兩側提供響應式內距 (`px-4 sm:px-6 lg:px-8`)。
- **卡片節奏 (Card Spacing):** 標準卡片內距使用 `--card-spacing: 16px` (`p-4` 或 `p-6`)，緊湊型卡片使用 `12px` (`data-size="sm"`: `p-3`)。
- **操作列排版 (Action Row):** 表格與列表頂部操作列採用 `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`，確保行動端自動折疊、桌面端橫向展開。
- **高密度管理格線 (Admin Grid):** 後台看板與報表卡片採用 2 到 3 欄等寬網格 (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`)，保持一致的視覺密度。

## Elevation & Depth

RepairHub 採取「平面層疊 (Flat-Tonal Layering)」哲學，預設不依賴模糊擴散的沉重陰影，而是透過背景色階差（`bg-card` vs `bg-muted/50`）以及精密的 1px 外框與環線（`ring-1 ring-foreground/10` 或 `border border-border`）建立乾淨的層級關係。

### Shadow Vocabulary
- **Subtle Surface** (`shadow-xs` / `0px 1px 3px 0px hsl(0 0% 0% / 0.05)`): 僅用於微幅抬升浮動卡片或重要 Banner，賦予微妙的實體感。
- **Structural Ring** (`ring-1 ring-foreground/10`): 卡片與對話框標準邊界，取代投影模糊，在暗色模式下維持晶透銳利。
- **Brutalist Preset Shadow** (`4px 4px 0px 0px hsl(0 0% 0% / 1)`): 僅在切換至 `brutalist` 主題預設時啟用的硬式工業幾何投影。

### Named Rules
**The Tonal-Over-Shadow Rule.** 介面元件層次優先以色階差異與 1px 細外框表現，禁止在標準主題下疊加深度模糊的裝飾性陰影。

## Shapes

- **基礎圓角 (Base Radius):** 預設值為 `0.625rem` (10px)。
- **按鈕與表單 (Button & Input):** `rounded-lg` (10px)，緊湊規格使用 `rounded-[min(var(--radius-md),10px)]` (8px)。
- **容器卡片 (Card & Dialog):** `rounded-xl` (14px)，外框與子元素圖片圓角聯動適配。
- **狀態標籤 (Badges & Pills):** `rounded-4xl` (全圓形膠囊 / 9999px)。

### Named Rules
**The Capsule-for-Status Rule.** 狀態指示標籤、角色識別 Badge 與分類 Tag 一律使用全圓膠囊狀（rounded-4xl）；按鈕與卡片則使用結構幾何圓角（rounded-lg / rounded-xl）。嚴禁將可操作之主按鈕設定為膠囊圓角，以明確區隔「操作控制」與「狀態資訊」。

## Components

### Buttons
- **Shape:** 結構圓角 (10px / `rounded-lg`)。
- **尺寸層級:** 標準高度 32px (`h-8 px-2.5 text-sm`)；小按鈕 28px (`h-7 px-2.5 text-xs`)；超小按鈕 24px (`h-6 px-2 text-xs`)；加大按鈕 36px (`h-9 px-2.5`)。
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/80`，穩健的碳墨表面。
- **Outline:** `border-border bg-background hover:bg-muted hover:text-foreground`，次要動作。
- **Secondary:** `bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]`。
- **Destructive:** `bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20`，警示操作。
- **微動態反饋:** 點擊時產生 1px 物理下壓位移（`active:not-aria-[haspopup]:translate-y-px`），帶來如同機械開關般的紮實觸感。
- **聚焦治療:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`。

### Inputs / Form Fields
- **Shape:** 10px 圓角 (`rounded-lg`)。
- **規格:** 高度 32px (`h-8`)，水平內距 10px (`px-2.5`)，字級 14px (`text-sm`)。
- **Style:** 預設透明底色、細緻邊框 (`border border-input bg-transparent`)，暗色模式輔以微弱背景光 (`dark:bg-input/30`)。
- **Focus:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`。
- **驗證異常:** `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`。

### Cards / Containers
- **Shape:** 14px 圓角 (`rounded-xl`)。
- **邊框結構:** 結合 1px 細環線（`ring-1 ring-foreground/10`）與底色 (`bg-card text-card-foreground`)。
- **頁尾分離:** 卡片 Footer 採用次要灰階與上邊框分離 (`rounded-b-xl border-t bg-muted/50 p-4`)，強調操作區域的劃分。

### Status Badges
- **Shape:** 全圓膠囊狀 (`rounded-4xl`)。
- **規格:** 固定高度 20px (`h-5 px-2 py-0.5 text-xs font-medium`)。
- **語意樣式:** 支援 `default` (碳墨主色), `secondary` (淺灰中立), `destructive` (警示赤紅), `outline` (細線空心)。

### Navigation / Sidebar
- **結構:** 左側導覽列支援標準與收合圖示模式（Collapsible icon mode）。
- **樣式:** 獨立語意變數 `--sidebar`、`--sidebar-border` 與 `--sidebar-accent`，與主工作區形成乾淨的邊界切割。

## Do's and Don'ts

### Do:
- **Do** 一律使用系統語意 Token（`bg-background`, `text-primary`, `border-border`），維持多主題預設與暗色模式的相容性。
- **Do** 遵循 32px 標準高度（`h-8`）與緊湊空間節奏，維持高效率管理後台的資訊密度。
- **Do** 狀態標籤一律使用全圓膠囊狀（`rounded-4xl`），並搭配對應的 Lucide 狀態圖示。
- **Do** 數字序號、時間戳記與工單代號使用等寬或 Mono 字型顯示。
- **Do** 為所有可互動元素保留清晰的 `focus-visible:ring-3` 鍵盤無障礙支援。

### Don't:
- **Don't** 寫死任何非主題色彩碼（如 `#2563eb`、`bg-blue-600` 或任意 OKLCH 常數）。
- **Don't** 使用大半徑高模糊的擴散陰影（如 `shadow-2xl`），破壞平面層疊與公約設計的俐落質感。
- **Don't** 將操作按鈕設定為全圓膠囊形（Pill shape），造成控制項與狀態標籤的認知混淆。
- **Don't** 隨意修改 `src/components/ui/` 核心組件代碼，保持 shadcn 組件庫原汁原味。
- **Don't** 在無狀態意義的卡片或容器上任意疊加飽和色彩背景。
