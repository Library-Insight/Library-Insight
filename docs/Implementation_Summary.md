# Library Insight Dashboard Built

The library usage dashboard has been fully built based on the PRD, Technical Design, reference implementation, and **real data** from the provided Excel workbook.

## What was done:
1. **.gitignore configured**: The existing raw files (Excel, reference JSX, PRD, and Tech Design) have been appropriately ignored as requested, alongside standard Node.js and OS ignore patterns.
2. **Data Pipeline**: Built a Python parser that combed through the Transactions, Database Usage, and Total Usage sheets of the provided Alliance Library Usage Statistics DATA.xlsx. This pulled 100% real statistics exactly as formatted in the workbook and wrote it into a structured src/data.js payload.
3. **Application Stack**: Scaffolded a brand new Vite + React environment. 
4. **Dashboard Built**: Created the LibraryInsightDashboard component mapped entirely to the real usage data.
    - **Domains**: 
      - Circulation & Gate Entry (by School)
      - Database Usage (by Vendor) 
      - Library Services (by Service Type)
      - Online Resources (by Month) - Added because OPAC and IDP remote access had rich time-series data in the "Total Usage" sheet.
    - **Filters**: Included interactive month range filters (Jan-Dec 2025).
    - **Visualizations**: Fully functional Recharts integration for Compare (Bar), Trend (Line/Area), and Share (Pie) visualization modes.

The dashboard is currently being served locally via Vite on http://localhost:5173. You can open this URL in your browser to interact with the finished product.
