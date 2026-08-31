# RepairHub — 校園維修通報系統

A campus facility repair reporting and tracking system. Anyone can submit repair tickets (anonymously or logged in); technicians claim and resolve them; admins oversee the entire workflow.

## Language

### Core Entities

**Ticket**:
A repair request describing a broken or malfunctioning item at a specific location. Created by a reporter, worked on by a technician, and closed after confirmation.
_Avoid_: Case, order, work order, report

**Reporter**:
The person who submits a ticket. This is a behavior, not a system role — anyone (including technicians and admins) can be a reporter.
_Avoid_: Submitter, requester, user

**Technician**:
A user with the `technician` role who can view pending tickets, claim them, record repair progress, and submit closure.
_Avoid_: Repairman, worker, staff, maintenance personnel

**Admin**:
A user with the `admin` role who has full system access: assigning tickets, managing equipment, viewing reports, and managing system settings.
_Avoid_: Manager, supervisor, operator

### Locations

**Building**:
A named structure on campus that contains one or more spaces. The top level of the two-level location hierarchy.
_Avoid_: Venue, facility, block

**Space**:
A specific room, hallway, or area within a building. The bottom level of the location hierarchy. Each space can have its own QR code.
_Avoid_: Room (acceptable in casual use), location (too generic), area

### Assets

**Equipment**:
A trackable physical asset installed in a space (e.g., projector, air conditioner). Has its own lifecycle data (purchase date, warranty, repair history) and can have its own QR code.
_Avoid_: Device, asset (acceptable in technical context), item

**Category**:
A classification for repair requests (e.g., plumbing, electrical, HVAC). Stored in the database and manageable by admins. Technicians subscribe to categories they handle.
_Avoid_: Type, kind, tag

### Workflow

**Claim**:
The act of a technician voluntarily taking ownership of a pending ticket. Atomic operation — only one technician can successfully claim a given ticket.
_Avoid_: Accept, take, pick up

**Assignment**:
An admin manually designating a specific technician to handle a ticket. Unlike a claim, the technician does not choose — they are assigned.
_Avoid_: Dispatch, delegate, allocate

**Closure**:
The final resolution of a ticket. Happens when the reporter confirms the repair is satisfactory, or automatically after 7 days of no response following completion.
_Avoid_: Resolution, completion (completion means repair is done, not that the ticket is closed)

**Reopen**:
The act of a reporter returning a completed ticket back to in-progress when the repair is incomplete or the issue persists.
_Avoid_: Reject, refile, renew

**Return to Pending**:
An admin resetting an in-progress ticket back to pending status and clearing its assigned technician so it can be claimed or assigned again.
_Avoid_: Unassign, reset, withdraw

**Deactivation**:
An admin disabling a user account. The account and all its data are preserved, but the user can no longer log in. Reversible — an admin can reactivate the account at any time.
_Avoid_: Ban, suspend, delete, block

### Ticket Statuses

**Pending** (`pending`):
A newly created ticket awaiting a technician to claim or an admin to assign it.

**In Progress** (`in_progress`):
A ticket that has been claimed or assigned and is actively being worked on.

**Completed** (`completed`):
Repair work is finished and the technician has submitted closure evidence (photos + notes). Awaiting reporter confirmation or auto-closure.

**Closed** (`closed`):
The ticket lifecycle is finished. Either the reporter confirmed satisfaction or the 7-day auto-close triggered.

**Cancelled** (`cancelled`):
The ticket was invalidated by an admin (e.g., duplicate, not actionable). Terminal state.
