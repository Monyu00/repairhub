---
target: 前台首頁
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
p2_count: 2
target_identity: "file:D:\\RepairHub\\src\\app\\(public)\\page.tsx"
target_fingerprint: "sha256:0e539267b0634b3d7ad6c8c9748575d12b8c293a67618b69087b37537fd6575f"
target_path: "D:\\RepairHub\\src\\app\\(public)\\page.tsx"
timestamp: 2026-10-17T15-54-39Z
slug: src-app-public-page-tsx
---
⚠️ DEGRADED: single-context (spawn_agent unavailable in this session)

## 前台首頁 Critique

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | 篩選與搜尋使用 `useTransition`，但 pending 狀態未呈現；慢速網路下不會顯示正在更新。 |
| 2 | Match System / Real World | 3 | 校園報修用語直覺，但「我要通報報修」語意重複，狀態流程也缺少簡短說明。 |
| 3 | User Control and Freedom | 3 | 重置、清除、分頁與返回路徑清楚；桌面表格列沒有鍵盤入口。 |
| 4 | Consistency and Standards | 2 | 手機卡片是可聚焦的 Link，桌面表格列卻只能滑鼠點擊；Tabs 也缺少對應 panel。 |
| 5 | Error Prevention | 3 | 篩選選項受限，空狀態能引導重設或直接報修。 |
| 6 | Recognition Rather Than Recall | 3 | 選項大多可見，但三個 Select 沒有可存取名稱，搜尋在手機也沒有可見送出按鈕。 |
| 7 | Flexibility and Efficiency | 3 | 桌面表格密度、分頁與手機卡片切換有效；尚缺快速狀態入口或常用條件。 |
| 8 | Aesthetic and Minimalist Design | 3 | 整體乾淨一致，但手機首屏被 Hero、公告與三層篩選占滿，第一筆案件落到約 807px。 |
| 9 | Error Recovery | 2 | 空狀態良好；查詢失敗沒有獨立錯誤態，使用者可能誤以為只是沒有資料。 |
| 10 | Help and Documentation | 1 | 沒有狀態圖例、報修流程說明或可即時取得的協助入口。 |
| **Total** |  | **25/40** | **Acceptable** |

### Design Specificity Verdict

**LLM assessment**: 約 6/10。桌面表格、等寬單號、低裝飾邊框與狀態 badge 已經有「透明維修公約」的味道，公開案件清單也能看出此產品不是通用 SaaS。但最上方仍是可替換成任何校園服務的歡迎卡與漸層 Hero，沒有把 `pending -> in_progress -> completed` 的閉環、設備履歷或校園場域做成首頁記憶點。

**Deterministic scan**: 8 個首頁相關來源檔案的 CLI scan 為 0 primary findings。Browser overlay 注入成功，無可見 `[Human]` tab；overlay 報告 4 個實例、3 類規則：公告日期與分頁摘要低對比、全站 Geist 字體、小型狀態點 `animate-pulse`。Geist 是 `DESIGN.md` 的品牌承諾，列為 false positive；脈動狀態點則在 `prefers-reduced-motion` 下仍會持續動畫。

**Browser accessibility**: axe 回報 11 個違規節點，分成 3 組：1 個無效 `aria-controls`、6 個沒有可辨識名稱的按鈕或 combobox、4 個低對比文字。另有 3 個 Hero 文字因背景漸層而無法自動判定對比。

### Overall Impression

這是可用且視覺一致的操作型首頁，桌面掃讀效率尤其好。最大機會不是重新裝飾，而是把「公開透明」做得更可操作：讓案件列可用鍵盤進入、讓篩選與 Tabs 具備正確語意，並讓手機首屏更快到第一筆案件。

### What's Working

1. `我要通報報修` 在桌面與手機都清楚可見，主要任務不需要猜測入口。
2. 桌面表格以單號、地點、狀態、技師與時間形成高效率掃讀順序，視覺密度符合管理型產品。
3. 手機自動切換為卡片，空狀態也同時提供重設與新報修兩個出口，基本 recovery 路徑完整。

### Priority Issues

1. **[P1] 桌面案件列只能用滑鼠開啟**
   **Why it matters**: 13 筆列表列的 `onClick` 是唯一入口，`tabIndex` 為 `-1`，列內也沒有 Link、role 或鍵盤處理；鍵盤與螢幕閱讀器使用者無法完成「查看案件」這項核心任務。
   **Fix**: 將單號或整列改成真正的 Link；若保留整列點擊，必須補齊可供鍵盤操作的語意與 focus 狀態。
   **Suggested command**: `$impeccable harden`

2. **[P1] Tabs、篩選器與分頁控制缺少正確可存取語意**
   **Why it matters**: `HomepageTabs` 使用 Radix Tabs 但沒有 `TabsContent`，未登入時又只有一個 tab，axe 因此判定 `aria-controls` 指向不存在的內容；三個篩選 Select 與每頁筆數 Select 皆無名稱，手機上的禁用上一頁、下一頁也無名稱。搜尋欄清除按鈕同樣只有 `X` icon。
   **Fix**: 單一入口改用 Link 或 toggle group；SelectTrigger、清除按鈕與禁用分頁補上繁中 `aria-label` 或可見 label，Tabs 則需有對應 panel。
   **Suggested command**: `$impeccable audit`

3. **[P1] 中文頁面仍宣告 `lang="en"`，且次要文字對比不足**
   **Why it matters**: 螢幕閱讀器會以英文語音規則處理繁中內容；公告日期、公告頁碼、查看內文與分頁摘要有 4.27:1 或 3.23:1 的低對比，未達 WCAG AA 的 4.5:1。
   **Fix**: 根層改成 `lang="zh-Hant"`，並提高 `text-muted-foreground/80` 與公告淺底上的次要文字對比。
   **Suggested command**: `$impeccable harden`

4. **[P2] 手機觸控目標過小，篩選層阻斷內容**
   **Why it matters**: 主題切換為 32px、登入為 28px、公告切點為 24px、Tabs trigger 為 23px、Select 為 32px；三層篩選與公告使 390px 寬裝置的第一筆案件落在約 807px，第一屏幾乎看不到實際案件。
   **Fix**: 主要觸控目標至少 44px，將三個 Select 收進篩選 Drawer 或可折疊區，未登入時移除只有一個選項的 Tab control。
   **Suggested command**: `$impeccable adapt`

5. **[P2] 首頁的產品辨識仍停留在通用服務入口**
   **Why it matters**: 公開透明、設備履歷與維修閉環是 RepairHub 的差異點，但 Hero 主要仍是通用歡迎文案；使用者無法從首屏理解狀態流程或「這是一套校園資產維修履歷」。
   **Fix**: 以簡潔的狀態流程、設備與場域線索取代裝飾性 Hero 文案，讓公開列表與通報 CTA 共享同一個透明閉環敘事。
   **Suggested command**: `$impeccable shape`

### Persona Red Flags

**Jordan (First-Timer)**: 能看懂主要 CTA，但手機搜尋沒有可見送出按鈕，只能猜測鍵盤 Enter 會送出；未登入時仍看到只有一個選項的 Tab，會誤以為還有看不到的其他頁籤。

**Sam (Accessibility-Dependent)**: 無法用鍵盤開啟桌面案件列；三個篩選器與分頁按鈕沒有可辨識名稱；頁面語系是英文；Tabs 的 `aria-controls` 指向不存在的內容。

**Casey (Distracted Mobile User)**: 第一個畫面先經過 Hero、公告、單一 Tab 與三層全寬篩選，第一筆案件約在 807px 才出現；多數控制高度只有 23px 到 36px，單手操作容易誤觸。

### Minor Observations

- 公告切換點有 24px 的空白點擊範圍，視覺點本身更小，對手指操作不友善。
- 維修中狀態點使用 `animate-pulse`，缺少 `motion-reduce:animate-none`。
- Hero 的 `bg-gradient-to-br` 幾乎不可見，對平鋪式「Transparent Ledger」沒有實質幫助。
- 「我要通報報修」可縮短為「我要報修」，語意更自然。
- `text-muted-foreground/80` 疊加在半透明文字上，是造成第二個對比違規的直接來源。

### Questions to Consider

1. 在 390px 首屏中，應該優先讓使用者看到報修 CTA，還是第一筆公開案件？
2. 如果公開透明度是產品差異點，首頁是否應該直接呈現工單狀態流，而不是用通用 Hero 說明？
3. 未登入使用者只有一個目的地時，是否還需要 Tabs 元件？
4. 篩選條件能否在手機改成單一「篩選」入口，並將目前條件以 chips 顯示？
