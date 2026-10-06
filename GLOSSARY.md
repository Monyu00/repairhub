# RepairHub — 校園維修通報系統

RepairHub 是一套校園設施維修與工單追蹤管理系統。提供報修單提交與指派處理、設備與空間維護，以及營運資訊發佈。任何人皆可通報維修（匿名或登入），技師認領並處理工單，管理員監管整體流程。
A campus facility repair reporting and tracking system. Anyone can submit repair tickets (anonymously or logged in); technicians claim and resolve them; admins oversee the entire workflow.

## Language

### Core Entities

**Ticket**:
描述特定地點物品損壞或故障的報修請求。由通報人建立，技師承接處理，並於驗收確認後結案。
_A repair request describing a broken or malfunctioning item at a specific location. Created by a reporter, worked on by a technician, and closed after confirmation._
_Avoid_: Case, order, work order, report

**Reporter**:
提交報修單的人員。這是一種行為角色而非系統帳號權限——任何人（包含技師與管理員）皆可擔任通報人。
_The person who submits a ticket. This is a behavior, not a system role — anyone (including technicians and admins) can be a reporter._
_Avoid_: Submitter, requester, user

**Technician**:
具備 `technician` 角色的系統使用者，可檢視待處理工單、主動認領、記錄維修進度與提交完工結案。
_A user with the `technician` role who can view pending tickets, claim them, record repair progress, and submit closure._
_Avoid_: Repairman, worker, staff, maintenance personnel

**Admin**:
具備 `admin` 角色的系統使用者，擁有完整系統權限：指派工單、管理設備、查看報表與管理系統設定。
_A user with the `admin` role who has full system access: assigning tickets, managing equipment, viewing reports, and managing system settings._
_Avoid_: Manager, supervisor, operator

### Locations

**Building**:
校園內具名稱之實體建築物，包含一或多個空間。為兩層級地點架構的頂層。
_A named structure on campus that contains one or more spaces. The top level of the two-level location hierarchy._
_Avoid_: Venue, facility, block

**Space**:
建築物內的具體房間、走廊或區域。為地點架構的底層，每個空間皆可擁有獨立 QR code。
_A specific room, hallway, or area within a building. The bottom level of the location hierarchy. Each space can have its own QR code._
_Avoid_: Room (acceptable in casual use), location (too generic), area

### Assets

**Equipment**:
安裝於特定空間內的可追蹤實體設備（如投影機、冷氣）。具備獨立生命週期資料（購置日期、保固、維修紀錄），亦可擁有獨立 QR code。
_A trackable physical asset installed in a space (e.g., projector, air conditioner). Has its own lifecycle data (purchase date, warranty, repair history) and can have its own QR code._
_Avoid_: Device, asset (acceptable in technical context), item

**Category**:
報修項目的業務分類（如水電、冷氣空調、弱電等）。儲存於資料庫並由管理員管理，技師可訂閱其負責處理的類別。
_A classification for repair requests (e.g., plumbing, electrical, HVAC). Stored in the database and manageable by admins. Technicians subscribe to categories they handle._
_Avoid_: Type, kind, tag

### Announcements

**Announcement**:
發佈給內部人員或公開訪客的系統與營運資訊通知。
_A system or operational notice published to internal staff or public visitors._
_Avoid_: Notice, Bulletin, News

**Audience**:
公告的目標對象分類，限定內部人員（`internal`）、公開訪客（`public`）或全體（`all`）。
_Target audience classification for an announcement, restricted to internal staff (`internal`), public visitors (`public`), or all (`all`)._
_Avoid_: Target, Scope, Visibility

### Workflow

**Claim**:
技師主動承接並取得待處理工單所有權的行為。為不可分割之操作（Atomic operation）——同一張工單僅允許一名技師認領成功。
_The act of a technician voluntarily taking ownership of a pending ticket. Atomic operation — only one technician can successfully claim a given ticket._
_Avoid_: Accept, take, pick up

**Assignment**:
管理員手動指定特定技師處理工單。與技師主動認領（Claim）不同，技師為被動指派。
_An admin manually designating a specific technician to handle a ticket. Unlike a claim, the technician does not choose — they are assigned._
_Avoid_: Dispatch, delegate, allocate

**Closure**:
工單的最終完工結案。當通報人確認維修結果滿意，或完工後逾 7 日無異議由系統自動觸發。
_The final resolution of a ticket. Happens when the reporter confirms the repair is satisfactory, or automatically after 7 days of no response following completion._
_Avoid_: Resolution, completion (completion means repair is done, not that the ticket is closed)

**Reopen**:
當維修未徹底或問題持續存在時，通報人將已完工之工單退回處理中的行為。
_The act of a reporter returning a completed ticket back to in-progress when the repair is incomplete or the issue persists._
_Avoid_: Reject, refile, renew

**Return to Pending**:
管理員將處理中之工單重設回待處理狀態並清除其指派技師，使其可重新被認領或指派。
_An admin resetting an in-progress ticket back to pending status and clearing its assigned technician so it can be claimed or assigned again._
_Avoid_: Unassign, reset, withdraw

**Deactivation**:
管理員停用使用者帳號。保留帳號與所有關聯資料，但該使用者無法再登入系統；管理員可隨時重新啟用帳號。
_An admin disabling a user account. The account and all its data are preserved, but the user can no longer log in. Reversible — an admin can reactivate the account at any time._
_Avoid_: Ban, suspend, delete, block

**Rating**:
通報人於確認修復時對維修結果的選填 1–5 星等評價。存於工單上，僅在通報人主動確認結案時收集；自動結案與未評分的工單不計入統計。工單被重新開啟時清除既有評分。
_An optional 1–5 star score a reporter provides when confirming a fix. Stored on the ticket. Collected only during reporter-initiated closure; auto-closed and unrated tickets are excluded from statistics. Cleared when a ticket is reopened._
_Avoid_: Review, feedback, survey, satisfaction score

### Ticket Statuses

**Pending** (`pending`):
剛建立並等待技師認領或管理員指派的全新工單。
_A newly created ticket awaiting a technician to claim or an admin to assign it._

**In Progress** (`in_progress`):
已由技師認領或管理員指派，且目前正在積極處理維修中的工單。
_A ticket that has been claimed or assigned and is actively being worked on._

**Completed** (`completed`):
維修作業已完成，技師已提交結案佐證（照片與說明）。等待通報人驗收確認或系統 7 日後自動結案。
_Repair work is finished and the technician has submitted closure evidence (photos + notes). Awaiting reporter confirmation or auto-closure._

**Closed** (`closed`):
工單生命週期結束。通報人已確認修復滿意或 7 日自動結案已觸發。
_The ticket lifecycle is finished. Either the reporter confirmed satisfaction or the 7-day auto-close triggered._

**Cancelled** (`cancelled`):
工單已被管理員作廢無效化（例如重複報修、非可執行案件）。為終端狀態。
_The ticket was invalidated by an admin (e.g., duplicate, not actionable). Terminal state._
