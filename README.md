# 📚 Library Insight — Alliance University Library Usage Analytics Platform

> **An interactive, self-serve visual analytics dashboard transforming raw library usage statistics into real-time decision-making insights.**

---

## 👥 Project Team

*(Listed in alphabetical order)*

* **ES Sriram**
* **Mohammed Ayaan Adil Ahmed**
* **Mohith B S**
* **Shibil Ahamed**

---

## 🎯 Motive & Problem Statement

### The Problem
The Central Library at Alliance University logs thousands of usage events monthly across physical book circulation, gate entries, electronic database searches, and support services (DDS, ILL, DELNET, Reference Queries). Historically, these statistics were transcribed manually into a shared Excel workbook. 

This legacy workflow suffered from major drawbacks:
* **Error-Prone & Fragile:** Manual data entry led to inconsistent column usage, missing entries, and transcription errors.
* **Slow Reporting:** Answering simple questions like *"How did EBSCO database searches compare to IEEE between March and August?"* required someone to open Excel, write formulas, and pivot data manually.
* **Lack of Visualization:** Static numbers offer no immediate visual clarity to library directors or university administration without manually building charts each time.
* **Accreditation Delays:** Preparing reports for accreditation bodies (NAAC/NBA) required days of manual report assembly.

### The Solution
**Library Insight** replaces the static Excel workflow with a high-performance, self-serve analytics platform. Any staff member or decision-maker can pick a data domain, select metrics, filter by date ranges, and instantly generate interactive charts without writing a single line of code or touching Excel.

---

## 🏗 System Architecture

The project follows a phased architecture transitioning from a lightweight client-side demo to an automated production pipeline.

### Phase 1 Architecture (Current Implementation)
100% of the actual 2025 Excel dataset was processed via a Python ETL script and compiled into a structured JSON dataset (src/data.js). The React client renders visualizations client-side with sub-200ms response times.

`
+------------------------------------------+
|  Alliance 2025 Excel Data Sheet (.xlsx)  |
+------------------------------------------+
                    |
                    v
    [ Python ETL Script (openpyxl) ]
                    |
                    v
    [ Structured Payload: src/data.js ]
                    |
                    v
  [ React + Vite Client-Side App (Recharts) ]
                    |
                    v
        [ Interactive Dashboard ]
`

### Phase 2 & 3 Production Architecture (Roadmap)
In the production phase, live vendor APIs (SUSHI/COUNTER standards) and an Integrated Library System (ILS) feed an automated backend pipeline. Non-API vendors use a structured web data-entry form to replace Excel entirely.

`
 [ Vendor SUSHI/COUNTER APIs ] ---\
 [ ILS Circulation API       ] ----+--> [ Python ETL Pipeline ] --> [ PostgreSQL ] --> [ FastAPI ] --> [ React Visual Dashboard ]
 [ Web Data Entry Form       ] ---/
`

---

## 💻 Technology Stack

### Frontend & Visualization
* **React 18**: Component-based UI framework powering instant state updates.
* **Vite**: Next-generation frontend tooling providing fast development servers and optimized production bundles.
* **Recharts**: Modular charting library built for React (BarChart, LineChart, AreaChart, PieChart).
* **Lucide React**: Modern icon set for sleek UI navigation.
* **CSS / Inline Styles**: Custom responsive styling featuring Alliance University brand colors.

### Data Processing & Pipeline
* **Python 3**: Automated data extraction script parsing multi-sheet Excel files.
* **OpenPyXL**: Spreadsheet parsing library extracting cell values across Transactions, Database Usage, and Total Usage sheets.

### Deployment & Hosting
* **Git & GitHub**: Distributed version control and source code management.
* **Vercel / Netlify**: Continuous deployment static site hosting.

---

## ⚡ What is Implemented (Current Status)

- [x] **Complete Data Ingestion**: Extracted 100% of real 2025 usage data from Alliance Library Usage Statistics DATA.xlsx.
- [x] **Self-Serve Visual Analytics**: 
  - **4 Data Domains**:
    1. **Circulation & Gate Entry**: School-wise breakdown across 9 schools (ASB, ACED, ASL, ASOLA, AAC, ASAC, ASAE, ASOD, ASOPA).
    2. **Database Usage**: Vendor-wise activity across 15 digital databases (EBSCO, IEEE, JSTOR, HeinOnline, LexisNexis, Scopus, SciFinder, etc.).
    3. **Library Services**: Service usage counts (DDS, ILL, Photocopy, CAS, DELNET, Library Blog, LQMS Reference Queries, User Training).
    4. **Online Resources**: Macro time-series trends (OPAC views, Digital Library, IDP Remote Access).
- [x] **Instant Chart Switching**: Toggle dynamically between **Compare (Bar)**, **Trend (Line/Area)**, and **Share (Pie)** views.
- [x] **Date Range Filtering**: Interactive month range selector (Jan – Dec 2025).
- [x] **Electronic Resource Category Filtering**: Filter database vendors by discipline (*Business*, *Engineering*, *Law*, *Multidisciplinary*).
- [x] **Dynamic KPI Summary Cards**: Live calculated metrics showing Total Activity, Monthly Averages, and Top Performing School/Vendor.
- [x] **Production Deployment Ready**: Configured for instant deployment on Vercel/Netlify.

---

## 🔄 User Workflow

1. **Select Data Domain**: Choose a domain from the left panel (*Circulation & Gate Entry*, *Database Usage*, *Library Services*, or *Online Resources*).
2. **Select Metric**: Pick the metric of interest (e.g., *Books Issued*, *Gate Entries*, *Searches*, *Downloads*).
3. **Filter Date Range**: Choose the start and end month (e.g., *Jan 2025 to Aug 2025*).
4. **Choose Chart Type**: Click to switch between:
   * 📊 **Compare (Bar Chart)**: Evaluates performance across categories/schools.
   * 📈 **Trend (Line/Area Chart)**: Displays usage changes over time.
   * 🍕 **Share (Pie Chart)**: Shows percentage breakdown across total usage.
5. **Analyze KPIs**: Read the top summary cards for instant total totals, monthly averages, and peak performers.

---

## 🚀 What Needs to be Implemented (Future Roadmap)

- [ ] **Phase 2 — Vendor API Integration**: Implement automated SUSHI/COUNTER REST fetchers to pull live vendor statistics directly into a PostgreSQL database.
- [ ] **Phase 3 — Web Data Entry Form**: Build a role-restricted web form replacing Excel for manual entry vendors.
- [ ] **Phase 4 — Accreditation Export Engine**: Add 1-click export functionality (PDF / Excel / PPT) pre-formatted for NAAC/NBA accreditation filings.
- [ ] **Phase 5 — Authentication & RBAC**: Add University SSO / OAuth authentication with role-based access for staff vs. public administration.

---

## 🛠 Developer Setup & Local Execution Guide

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **Python 3.x** (optional, only if updating the Excel data extraction)

### Installation & Running Locally

1. **Clone the repository:**
   `ash
   git clone https://github.com/Library-Insight/Library-Insight.git
   cd Library-Insight
   `

2. **Install dependencies:**
   `ash
   npm install
   `

3. **Start the development server:**
   `ash
   npm run dev
   `
   Open http://localhost:5173 in your browser.

4. **Build for production:**
   `ash
   npm run build
   `
   The production-ready static bundle will be generated in the dist/ directory.

---

## 📄 License & Institutional Context

Created for **Alliance University, Central Library** (2025 Statistics). All rights reserved.
