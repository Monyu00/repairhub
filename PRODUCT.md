# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Reporter (報修者)**: 校園內的學生、教職員工與訪客。遇到現場設施損壞時，透過行動端掃碼或網頁快速通報，並可追蹤修復進度與提供滿意度評分。
- **Technician (維修技師)**: 負責校園設施修繕的內部技師團隊。瀏覽所屬分類待修工單、自主接單 (Claim)、記錄現場維修進度並上傳完工照片佐證。
- **Admin (管理員)**: 總務與設施管理主管。負責全域工單指派 (Assignment)、退回待處理 (Return to Pending)、設備與空間生命週期管理、統計報表分析與系統公告發布。

## Product Purpose

建立現代化、高效率且透明的校園設施報修與維修追蹤管理平台。降低現場報修門檻、消除資訊孤島、加速工單週轉率，並提供數據驅動的設施維護決策支援。

## Positioning

專為校園場景打造的雙軌報修與資產履歷管理系統：
- 支援免登入快速掃碼通報與登入會員專屬追蹤儀表板。
- 建立 Building（建築）與 Space（空間）兩級場域，結合 Equipment（設備）QR Code 綁定，實現單一設備全生命週期維修履歷。
- 嚴謹的工單原子化接單機制與照片佐證完工驗收閉環（滿意度評分、7 天自動關單、未完成重開單）。

## Operating Context

- **行動現場場景 (Reporter & Technician)**: 走廊、教室、洗手間、實驗室等校園各處，使用者普遍使用行動裝置（手機）掃碼、填單、拍照上傳。
- **桌面管理中心 (Admin)**: 總務處或維修調度辦公室，使用寬螢幕桌面瀏覽器進行全局排程、批次匯出、QR Code 批次產生與數據報表分析。

## Capabilities and Constraints

- **技術棧與規範**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (`radix-nova`), Supabase (Auth, Postgres, Storage, Webhooks)。
- **領域詞彙規範**: 嚴格遵循 [GLOSSARY.md](file:///d:/RepairHub/GLOSSARY.md) 定義之單一領域實體（Ticket, Space, Equipment, Claim, Assignment, Closure, Reopen, Return to Pending）。
- **狀態機閉環**: 狀態嚴格流轉（`pending` -> `in_progress` -> `completed` -> `closed` / `cancelled`），完工需附相片與維修說明，逾期 7 天未回覆自動關閉。

## Brand Commitments

- 遵循現有 shadcn/ui `radix-nova` 設計體系與語意化 CSS 變數 / 主題 tokens。
- 完整適配深色模式 (Dark Mode) 與淺色模式 (Light Mode) 以及主題預設檔 (Theme Presets)。
- 維持俐落、結構清晰且高資訊密度的專業儀表板設計風格，避免非語意化寫死色碼。

## Evidence on Hand

- 領域模型與術語手冊：[GLOSSARY.md](file:///d:/RepairHub/GLOSSARY.md)
- 架構決策記錄：
  - [0001-supabase-over-firebase.md](file:///d:/RepairHub/docs/adr/0001-supabase-over-firebase.md)
  - [0002-mixed-auth-anonymous-and-login.md](file:///d:/RepairHub/docs/adr/0002-mixed-auth-anonymous-and-login.md)
  - [0003-notifications-via-database-webhook.md](file:///d:/RepairHub/docs/adr/0003-notifications-via-database-webhook.md)
- 系統功能架構與選單定義：[sidebar-items.ts](file:///d:/RepairHub/src/navigation/sidebar/sidebar-items.ts)

## Product Principles

1. **現場回報零阻力**: 報修流程必須極度輕量直覺，免登入掃碼後應能在數十秒內完成通報。
2. **進程透明與責任閉環**: 工單流轉狀態全透明，接單與完工均有跡可循，落實照片佐證與驗收確認機制。
3. **語意一致與設計系統化**: 全面依循 shadcn 語意 Token 與標準領域模型，拒絕臨時拼湊與樣式孤島。
4. **全端響應與場景適配**: 行動端側重快速通報與現場接單回報，桌面端側重資訊密度與多維度管理分析。

## Accessibility & Inclusion

- 嚴格遵守 WCAG AA 標準，提供清晰的焦點狀態指示、語意化 HTML 結構、ARIA 屬性支援與足夠對比度。
