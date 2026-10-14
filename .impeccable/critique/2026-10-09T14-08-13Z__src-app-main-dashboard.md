---
target: 整個 Dashboard（所有已建置的畫面）
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\RepairHub\\src\\app\\(main)\\dashboard"
timestamp: 2026-10-09T14-08-13Z
slug: src-app-main-dashboard
---
# Impeccable Critique: RepairHub Dashboard（全域）

**Method:** ⚠️ DEGRADED: single-context (no sub-agent tool exposed)

**Target:** `src/app/(main)/dashboard` — 全部已建置畫面  
**Mode:** Operate  
**Date:** 2026-10-09

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Suspense fallback 存在但極度簡陋（純文字「載入資料中...」），缺少骨架屏或進度條；filter 切換時僅有微弱 `animate-pulse` 文字提示 |
| 2 | Match System / Real World | 4 | 全繁體中文用語精準、領域術語一致（報修單、維修中、已結案），符合台灣校園場景 |
| 3 | User Control and Freedom | 3 | 篩選器有清除按鈕，詳情頁有返回鍵；但無 undo/redo，刪除設備為硬性刪除無復原機制，分頁無法跳頁 |
| 4 | Consistency and Standards | 3 | 頁面 header 結構一致（h1 + description + actions）；但 KPI 卡片用了 `text-emerald-600`、`text-blue-500`、`text-amber-500` 等寫死 Tailwind 顏色類而非語意 token |
| 5 | Error Prevention | 2 | 設備刪除有確認 dialog，但報修單指派、退回待處理等操作缺少確認步驟；日期篩選允許 from > to 無驗證 |
| 6 | Recognition Rather Than Recall | 3 | Sidebar 有文字標籤搭配圖示，SearchDialog 全域搜尋存在；但 icon-only 操作按鈕（History/Edit/Delete）在 equipment 表格僅靠 `title` 非可見文字標籤 |
| 7 | Flexibility and Efficiency | 2 | 無鍵盤快捷鍵，無批次操作能力（批次指派、批次關單），分頁只有上下頁無法跳頁 |
| 8 | Aesthetic and Minimalist Design | 3 | 整體版面乾淨、資訊密度適當；Dashboard 首頁缺少 KPI 數據，淪為純導航頁面，浪費 viewport 最高價值空間 |
| 9 | Error Recovery | 2 | toast.success 有，但 error toast 處理不一致；Server Error 直接 console.error 未給使用者回饋；刪除無復原 |
| 10 | Help and Documentation | 1 | 全域無幫助文件、無 tooltip 說明、無 onboarding 提示、not-found 頁面用英文 "Page not found" |
| **Total** | | **26/40** | **Acceptable** |

---

## Design Specificity Verdict

### LLM 評估

RepairHub 的 Dashboard **確實有辨識度**，整體遵循了「透明公約（The Transparent Ledger）」的設計北極星：碳墨主色調、1px 環線取代厚重陰影、全圓膠囊狀態 badge、緊湊 32px 控件高度。這套設計語言不會跟其他隨機 admin panel 模板混淆。

但**設計特異性在內頁之間開始稀釋**：

- **Dashboard 首頁** 是純導航格子，沒有任何工單 KPI、趨勢數據或待辦摘要。任何管理後台都能長這樣——它不像一個校園修繕系統的指揮中心。
- **Reports 頁面** 的 KPI 卡片使用了 `text-emerald-600`、`bg-emerald-500/10`、`text-blue-500`、`bg-blue-500/10`、`text-amber-500`、`bg-amber-500/10` 等硬編碼色彩，偏離了 design.json 聲明的「The Ink and Signal Rule」——僅信號赤紅可飽和，其餘應為灰階。
- **跨頁面的空狀態** 差異明顯：tickets 用了結構化的 `<Empty>` 元件，equipment 用 `div.border-dashed`，announcements 又是另一套。

### 自動化偵測掃描

CLI 偵測器掃描了 `src/app/(main)/dashboard` 全部檔案，共回報 **65 項 advisory 級 findings**，全部為同一類別：

| 規則 | 數量 | 涉及檔案 |
|------|------|---------|
| `design-system-font-size` — 字級偏離 DESIGN.md 字型階梯 | 65 | 20+ 個元件檔案 |

高頻違規字級：
- `text-[11px]` — 32 處
- `text-[10px]` — 33 處

---

## Overall Impression

RepairHub 的 Dashboard 是一套**結構穩健但尚未完成的管理後台**。它已經具備了大多數 CRUD 功能頁面的骨架，設計語言有辨識度，shadcn/radix-nova 基座用得正確。

**最大的機會：Dashboard 首頁是一張空殼。** 作為管理員每天打開的第一個畫面，它只有一個歡迎語和 7 張靜態導航卡片——沒有待處理工單數、沒有今日新增、沒有異常警告、沒有趨勢火花線。

---

## What's Working

1. **統一的 header 節奏與 filter bar 設計**
2. **狀態 Badge 的語意化處理**
3. **Mobile 適配的雙軌策略**

---

## Priority Issues

### [P1] Dashboard 首頁缺乏 KPI 與操作性內容
### [P1] Reports 頁面硬編碼色彩違反設計規則
### [P2] 操作按鈕 icon-only 且無 a11y 文字標籤
### [P2] 日期篩選用原生 `<input type="date">`
### [P2] 空狀態體驗不統一

---

## Persona Red Flags

### Alex (Power User)
- 零鍵盤快捷鍵、無批次操作、分頁無法跳頁、Dashboard 首頁浪費時間

### Sam (Accessibility-Dependent)
- icon-only 按鈕觸控偏小、原生 date input、Not-found 英文文案

### Jordan (First-Timer)
- Dashboard 首頁無引導、技師接單 Tab 非預設、icon-only 操作難辨識

---

## Minor Observations

- `text-[11px]`/`text-[10px]` 系統性氾濫（65 處）
- Not-found 頁面英文文案
- Reports Row 3 & Row 4 留白過多
- Dashboard 「前台首頁」按鈕重複出現
