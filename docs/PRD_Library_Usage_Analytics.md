# PRD — Library Usage Analytics Platform
**Alliance University, Central Library**
Status: Draft for stakeholder review · Mock/demo phase

---

## 1. Problem

The library's e-resource and service usage stats (circulation, gate entry, database/vendor usage, and support services like DDS/ILL/photocopy) are currently compiled by hand into a shared Excel workbook, weekly or monthly, from emails and vendor portals. This is:

- **Error-prone** — manual transcription, inconsistent column use across months, missed entries when staff are unavailable.
- **Slow to report from** — answering "what happened between these two dates" means someone opening the sheet and manually filtering/summing.
- **Not visual** — no charts without someone building them by hand in Excel each time.
- **Not scalable** — adding a new vendor or service means restructuring the sheet.

## 2. Goal

Replace the manual Excel workflow with a system that:
1. Ingests usage data automatically wherever a vendor/system provides an API (Phase 2+, pending vendor API access — see prior technical doc).
2. Lets any staff member pick a date range, dimension (school/vendor/service), metric, and chart type, and get a chart immediately — no Excel, no waiting on someone to build it.
3. Provides a single source of truth that survives staff turnover.

**This PRD covers the demo/mock phase**: proving the self-serve visualization concept with sample data, before real vendor integrations are built (those require vendor-issued API credentials — separate workstream, in progress).

## 3. Users

| User | Need |
|---|---|
| Library staff (data entry) | Fast, structured way to log usage where no API exists yet |
| Librarian / library director | Answer "what happened between X and Y" in seconds, for internal reporting and renewal decisions |
| University administration | Periodic summary reports/exports for accreditation, budget review |
| IT/dev team | Clear, buildable spec |

## 4. Scope — this phase (mock)

**In scope:**
- A working interactive demo populated with realistic sample data, matching the real workbook's structure (schools, vendors, services, months).
- Self-serve chart builder: choose data domain → dimension → metric → date range → chart type (bar/line/pie), see the chart update instantly.
- Summary stat cards (total, average/month, top performer) alongside every chart.

**Out of scope for this phase** (see roadmap):
- Live vendor API integrations (SUSHI/COUNTER) — pending credential access.
- User authentication/roles.
- Data entry forms replacing Excel — next phase.
- Export to PDF/PPT for accreditation reports.

## 5. Functional requirements

### 5.1 Self-serve visualization (core feature)
- **FR1**: User can select a data domain: Circulation & Gate Entry, Database Usage, or Library Services.
- **FR2**: User can select one metric relevant to that domain (e.g., Books Issued, Searches, Downloads, Gate Entries).
- **FR3**: User can select a date range by month (from/to).
- **FR4**: User can switch chart type between Trend (line, over time), Compare (bar, across categories), and Share (pie, proportion of total) — same data, different lens, no page reload.
- **FR5**: Charts re-render immediately on any filter change (no "submit" button).
- **FR6**: Summary cards show total, monthly average, and top-performing category for the current filter selection.

### 5.2 Data model (mock phase)
- **FR7**: Sample dataset structurally mirrors the real workbook: 9 schools (ASB, ACED, ASL, ASOLA, AAC, ASAC, ASAE, ASOD, ASOPA), ~15 vendors across Business/Engineering/Law/Multidisciplinary categories, 8 recurring services (DDS, ILL, Photocopy, CAS, DELNET, Blog, LQMS, Training).
- **FR8**: Every screen/chart is clearly labeled "Sample Data / Mock" until real data is connected, to avoid the demo being mistaken for live figures.

## 6. Non-functional requirements
- Chart interactions should feel instant (<200ms) — data volume at this scale makes this trivial client-side for the mock; real-data phase computes this server-side (see technical doc).
- Mobile-responsive — staff should be able to check figures from a phone.
- No specialized training needed — a librarian, not a data analyst, is the primary user.

## 7. Success criteria for this phase
- Stakeholders can pick any date range and any metric live, in the meeting, and get a correct-looking chart without anyone touching code or Excel.
- Sign-off to proceed to Phase 2 (real vendor API integration) and Phase 3 (replace Excel entry with a proper form for non-API vendors).

## 8. Open questions for stakeholders
1. Which chart types are must-have beyond bar/line/pie (e.g., stacked bar for school+metric combos)?
2. Who needs access — all library staff, or just leadership? (drives Phase 4 auth requirements)
3. Should this eventually feed university-wide accreditation reports (NAAC/NBA), which may need specific report formats/exports?
