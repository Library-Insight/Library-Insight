# Technical Design — Library Usage Analytics Platform
Companion to the PRD. Covers architecture, data model, and frontend stack research for the mock phase, plus what changes once real vendor APIs are connected.

---

## 1. Architecture — mock phase vs. production phase

**Mock phase (what was just demoed):** sample data is generated to match the real schema and embedded directly in a self-contained frontend — no backend needed yet. This is intentional: it proves the UX (pick filters → get any chart type instantly) without waiting on vendor API access or infrastructure setup.

**Production phase:** the same frontend UI is kept, but data comes from a real API backed by PostgreSQL, itself fed by scheduled jobs pulling from vendor SUSHI/COUNTER endpoints, the ILS, and a manual-entry fallback for non-API vendors (see prior conversation for the full vendor-by-vendor breakdown and roadmap phases).

```
Mock:        [Sample data in-browser] → [Chart UI]
Production:  [Vendor APIs / ILS / manual form] → [ETL] → [PostgreSQL] → [API] → [Chart UI]
```

The chart UI itself doesn't need to change between phases — it's built to query by domain/dimension/metric/date-range regardless of where the data comes from, so the mock is genuinely reusable, not throwaway.

## 2. Data model (unchanged from earlier schema doc)

Reference: `Library_Usage_Automation_Schema_and_Roadmap.md` for the full field dictionary. Summary:

- **Dimensions**: `dim_school` (9 schools), `dim_vendor` (~15, tagged by category), `dim_service` (8 recurring services), `dim_date`.
- **Facts**: `fact_circulation`, `fact_gate_entry`, `fact_database_usage`, `fact_service_usage` — each with a `source` field (`sushi_api | ils_api | manual`) so automated vs. hand-entered rows are always distinguishable.

This same shape is what the mock's sample dataset mirrors, so migrating from mock → real data later is a data-swap, not a UI rebuild.

## 3. Frontend — stack research

The core requirement is: **non-technical staff pick filters and get any chart type on the spot.** Three real approaches exist; here's how they compare for this specific case.

| Approach | What it is | Pros | Cons | Fit here |
|---|---|---|---|---|
| **Embedded BI tool** (Apache Superset or Metabase) | Open-source, self-hosted BI — connect to Postgres, get instant ad-hoc chart building and dashboards with no frontend code | Fastest to stand up (days, not weeks); built-in chart-type switching, filtering, and dashboards out of the box; free | Look and feel is the tool's own UI, not custom-branded; requires self-hosting; Superset has a steeper admin/setup curve, Metabase is simpler but slightly less powerful for advanced viz | **Best for an internal-only tool where speed matters more than branding** |
| **Custom frontend** (React + a charting library, talking to your own API) | What was just demoed — full control over UX, filters, and visual identity | Fully branded, exact UX control (the specific "pick 3 things, get any chart" flow), can be embedded on the college's own site or portal | More development time; your team owns the maintenance | **Best if this needs to look like an official college product, or eventually gets used outside the library (admin dashboards, accreditation reports)** |
| **Low-code app builder** (Retool, Appsmith) | Drag-and-drop internal tool builder on top of your database | Very fast for internal admin tools, handles both the data-entry form (Phase 3) and dashboards in one tool | Same "not fully custom" tradeoff as BI tools; less natural for public-facing charts | Worth evaluating specifically for the **data-entry form** replacing Excel, less so for the visualization piece |

**Recommendation:** what was demoed today — a custom React frontend — is the right direction if this needs to look like a polished Alliance University product and potentially be shown to accreditation bodies or leadership outside the library. If speed-to-first-working-version matters more than branding, standing up Metabase against Postgres directly (zero frontend code, live in under a week) is a legitimate parallel path worth demoing alongside this one before committing.

### 3.1 Why Recharts (used in the demo) over alternatives
- **Recharts** — good default: covers bar/line/pie cleanly, React-native API, easy to theme to match the college's colors, moderate bundle size. Used in the demo.
- **Nivo / visx** — more customizable and prettier for bespoke visual design, but more code to get the same "instant chart-type switch" behavior — worth revisiting once the visual identity is finalized, not needed for the mock.
- **Chart.js** — solid but not React-native; more glue code for the same result.

For a self-serve tool where chart type changes on a click, Recharts' component-swap model (`<BarChart>` → `<LineChart>` → `<PieChart>` with the same data shape) is the simplest to build and maintain.

### 3.2 Frontend architecture (production phase)
- React app (same shell as the demo) calls a REST API: `GET /api/usage?domain=database&metric=searches&from=2026-01&to=2026-08&groupBy=vendor`
- API is a thin FastAPI layer over Postgres — does the aggregation (SUM/GROUP BY) server-side once real data volume grows past what's comfortable to ship to the browser and filter client-side (the mock does this client-side since the sample set is small).
- Same filter → chart-type mapping as the mock; only the data source changes.

## 4. What's needed before Phase 2 (real integration)
Everything above is buildable now. Phase 2 (live vendor data) is blocked only on: vendor SUSHI/COUNTER credentials (requested from each vendor's admin portal — action item on the library's side, not a technical one) and ILS API access for circulation/gate data. Once either is available, the ETL step slots in without touching the frontend.
