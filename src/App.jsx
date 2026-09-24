import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, Library, BookOpen, Database, Users, Activity } from "lucide-react";
import { REAL_DATA as DATA } from "./data";

const PALETTE = ["#1F3A5F","#C08A2E","#5B7C99","#8C6A3F","#3D5A73","#A67C3D","#274B6D","#B8965A","#4A7BA7"];

const DOMAINS = {
  circulation: {
    label: "Circulation & Gate Entry",
    icon: BookOpen,
    dimensionKey: "school",
    dimensionLabel: "School",
    dimensions: DATA.schools,
    metrics: [
      { key: "issue", label: "Books Issued" },
      { key: "renewal", label: "Renewals" },
      { key: "return", label: "Returns" },
      { key: "gate_entry", label: "Gate Entries" },
    ],
    rows: DATA.circulation,
  },
  database: {
    label: "Database Usage",
    icon: Database,
    dimensionKey: "vendor",
    dimensionLabel: "Vendor",
    dimensions: DATA.vendors,
    metrics: [
      { key: "searches", label: "Searches" },
      { key: "downloads", label: "Downloads" },
      { key: "total", label: "Total Activity" },
    ],
    rows: DATA.db_usage,
    categoryKey: "category",
  },
  services: {
    label: "Library Services",
    icon: Users,
    dimensionKey: "service",
    dimensionLabel: "Service",
    dimensions: DATA.services,
    metrics: [{ key: "value", label: "Usage Count" }],
    rows: DATA.svc_usage,
  },
  online: {
    label: "Online Resources",
    icon: Activity,
    dimensionKey: "month",
    dimensionLabel: "Month",
    dimensions: DATA.months,
    metrics: [
      { key: "opac_views", label: "OPAC Page Views" },
      { key: "digital_library", label: "Digital Library" },
      { key: "databases", label: "Databases Accessed" },
      { key: "idp_access", label: "IDP Remote Access" },
    ],
    rows: DATA.online_resources,
    isTimeSeries: true,
  },
};

const CHART_TYPES = [
  { key: "compare", label: "Compare", icon: BarChart2, desc: "Bar by category" },
  { key: "trend", label: "Trend", icon: LineIcon, desc: "Line over time" },
  { key: "share", label: "Share", icon: PieIcon, desc: "Pie breakdown" },
];

function monthIdx(m) { return DATA.months.indexOf(m); }
function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n); }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "#1B2432" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{p.name}:</span>
          <span>{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function LibraryInsightDashboard() {
  const [domainKey, setDomainKey] = useState("circulation");
  const domain = DOMAINS[domainKey];
  const [metricKey, setMetricKey] = useState(domain.metrics[0].key);
  const [chartType, setChartType] = useState("compare");
  const [fromMonth, setFromMonth] = useState("Jan");
  const [toMonth, setToMonth] = useState("Dec");
  const [categoryFilter, setCategoryFilter] = useState("All");

  function handleDomainChange(key) {
    setDomainKey(key);
    setMetricKey(DOMAINS[key].metrics[0].key);
    setCategoryFilter("All");
    setChartType("compare");
  }

  const lo = Math.min(monthIdx(fromMonth), monthIdx(toMonth));
  const hi = Math.max(monthIdx(fromMonth), monthIdx(toMonth));
  const monthsInRange = DATA.months.slice(lo, hi + 1);

  const filteredRows = useMemo(() => {
    let rows = domain.rows.filter((r) => monthsInRange.includes(r.month));
    if (categoryFilter !== "All" && domain.categoryKey) {
      rows = rows.filter((r) => r[domain.categoryKey] === categoryFilter);
    }
    return rows;
  }, [domain, monthsInRange, categoryFilter]);

  const activeDimensions = useMemo(() => {
    if (domain.categoryKey && categoryFilter !== "All") {
      return [...new Set(filteredRows.map((r) => r[domain.dimensionKey]))];
    }
    return domain.dimensions;
  }, [domain, filteredRows, categoryFilter]);

  const byDimension = useMemo(() => {
    if (domain.isTimeSeries) {
      return monthsInRange.map((m) => {
        const row = domain.rows.find((r) => r.month === m);
        return { name: m, value: row ? (row[metricKey] || 0) : 0 };
      });
    }
    const map = {};
    filteredRows.forEach((r) => {
      const dim = r[domain.dimensionKey];
      map[dim] = (map[dim] || 0) + (r[metricKey] || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows, domain, metricKey, monthsInRange]);

  const topDims = useMemo(() => byDimension.slice(0, 6).map((d) => d.name), [byDimension]);

  const trendData = useMemo(() => {
    if (domain.isTimeSeries) {
      return monthsInRange.map((m) => {
        const row = domain.rows.find((r) => r.month === m);
        return { month: m, [metricKey]: row ? (row[metricKey] || 0) : 0 };
      });
    }
    return monthsInRange.map((m) => {
      const entry = { month: m };
      let otherTotal = 0;
      activeDimensions.forEach((dimVal) => {
        const sourceRows = (domain.categoryKey && categoryFilter !== "All") ? filteredRows : domain.rows;
        const row = sourceRows.find((r) => r.month === m && r[domain.dimensionKey] === dimVal);
        const v = row ? (row[metricKey] || 0) : 0;
        if (topDims.includes(dimVal)) entry[dimVal] = v;
        else otherTotal += v;
      });
      if (activeDimensions.length > topDims.length) entry["Other"] = otherTotal;
      return entry;
    });
  }, [monthsInRange, domain, metricKey, topDims, activeDimensions, filteredRows, categoryFilter]);

  const totalValue = byDimension.reduce((s, d) => s + d.value, 0);
  const peakDim = byDimension[0];
  const avgPerMonth = monthsInRange.length ? Math.round(totalValue / monthsInRange.length) : 0;
  const currentMetricLabel = domain.metrics.find((m) => m.key === metricKey)?.label || "";
  const categories = domain.categoryKey ? ["All", ...new Set(domain.rows.map((r) => r[domain.categoryKey]))] : [];
  const trendKeys = domain.isTimeSeries
    ? [metricKey]
    : [...topDims, ...(activeDimensions.length > topDims.length ? ["Other"] : [])];
  
  return (
    <div style={{ background: "#F6F5F1", minHeight: "100vh", padding: 24, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#1B2432" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: "2px solid #E2E0D8" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#1F3A5F,#16283F)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(31,58,95,.3)" }}>
          <Library size={22} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#16283F" }}>Alliance Library — Usage Analytics</div>
          <div style={{ fontSize: 13, color: "#5A6474", marginTop: 2 }}>Alliance University · Central Library · 2025 Statistics</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "5px 12px", borderRadius: 999, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />LIVE DATA · 2025
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6474", margin: "0 0 8px 2px" }}>Data Domain</div>
          {Object.entries(DOMAINS).map(([key, d]) => {
            const Icon = d.icon;
            const active = domainKey === key;
            return (
              <button 
                key={key} 
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid transparent", background: active ? "#1F3A5F" : "transparent", color: active ? "#fff" : "#1B2432", fontSize: 13, cursor: "pointer", marginBottom: 4, fontWeight: active ? 600 : 500 }} 
                onClick={() => handleDomainChange(key)}>
                <Icon size={14} />{d.label}
              </button>
            );
          })}
          <div style={{ height: 1, background: "#E2E0D8", margin: "14px 0" }} />
          
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6474", margin: "0 0 8px 2px" }}>Metric</div>
          <select style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E0D8", background: "#F6F5F1", fontSize: 13, color: "#1B2432", marginBottom: 10, fontFamily: "inherit" }} value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
            {domain.metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          
          {!domain.isTimeSeries && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6474", margin: "0 0 8px 2px" }}>Date Range</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <select style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E0D8", background: "#F6F5F1", fontSize: 13, color: "#1B2432", fontFamily: "inherit" }} value={fromMonth} onChange={(e) => setFromMonth(e.target.value)}>
                  {DATA.months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E0D8", background: "#F6F5F1", fontSize: 13, color: "#1B2432", fontFamily: "inherit" }} value={toMonth} onChange={(e) => setToMonth(e.target.value)}>
                  {DATA.months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </>
          )}
          <div style={{ height: 1, background: "#E2E0D8", margin: "14px 0" }} />
          
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A6474", margin: "0 0 8px 2px" }}>Chart Type</div>
          <div style={{ display: "flex", gap: 6 }}>
            {CHART_TYPES.map((c) => {
              const Icon = c.icon;
              const a = chartType === c.key;
              return (
                <button 
                  key={c.key} 
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 10, border: a ? "1px solid #C08A2E" : "1px solid #E2E0D8", background: a ? "#EFE2C8" : "#F6F5F1", cursor: "pointer", fontSize: 10.5, color: a ? "#16283F" : "#5A6474", fontWeight: 600, fontFamily: "inherit" }} 
                  onClick={() => setChartType(c.key)} 
                  title={c.desc}>
                  <Icon size={14} />{c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              ["Total — " + currentMetricLabel, totalValue.toLocaleString(), domain.isTimeSeries ? "Full year 2025" : fromMonth + " – " + toMonth + " 2025"],
              ["Monthly Average", avgPerMonth.toLocaleString(), "per month in range"],
              ["Top " + (domain.isTimeSeries ? "Month" : domain.dimensionLabel), peakDim ? peakDim.name : "—", peakDim ? peakDim.value.toLocaleString() + " " + currentMetricLabel.toLowerCase() : "no data"]
            ].map(([lbl, val, sub], i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 12, padding: "14px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#1F3A5F,#C08A2E)" }} />
                <div style={{ fontSize: 10, color: "#5A6474", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{lbl}</div>
                <div style={{ fontSize: val.length > 6 ? 18 : 26, fontWeight: 700, color: "#16283F", marginTop: 4 }}>{val}</div>
                <div style={{ fontSize: 11, color: "#5A6474", marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {categories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {categories.map((c) => {
                const a = categoryFilter === c;
                return (
                  <button 
                    key={c} 
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, border: a ? "1px solid #1F3A5F" : "1px solid #E2E0D8", background: a ? "#1F3A5F" : "#F6F5F1", color: a ? "#fff" : "#5A6474", cursor: "pointer", fontFamily: "inherit" }} 
                    onClick={() => setCategoryFilter(c)}>
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14, padding: 18, minHeight: 400 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#16283F", marginBottom: 2 }}>
              {currentMetricLabel} by {domain.isTimeSeries ? "Month" : domain.dimensionLabel}
              {!domain.isTimeSeries && <> — {fromMonth} to {toMonth}</>}
              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#1F3A5F", background: "#EFE2C8", border: "1px solid #C08A2E", padding: "2px 8px", borderRadius: 999, marginLeft: 8, verticalAlign: "middle" }}>2025</span>
            </div>
            <div style={{ fontSize: 12, color: "#5A6474", marginBottom: 16 }}>
              {chartType === "trend" && !domain.isTimeSeries && "Monthly trend · top " + topDims.length + " " + domain.dimensionLabel.toLowerCase() + " values"}
              {chartType === "trend" && domain.isTimeSeries && "Monthly trend across 2025"}
              {chartType === "compare" && "Totals for selected date range, sorted descending"}
              {chartType === "share" && "Proportional breakdown across selected date range"}
            </div>
            
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "compare" ? (
                  <BarChart data={byDimension} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5A6474" }} angle={-30} textAnchor="end" interval={0} height={70} />
                    <YAxis tick={{ fontSize: 11, fill: "#5A6474" }} tickFormatter={fmt} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={currentMetricLabel} radius={[5, 5, 0, 0]}>
                      {byDimension.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                ) : chartType === "trend" ? (
                  domain.isTimeSeries ? (
                    <AreaChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <defs>
                        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5A6474" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6474" }} tickFormatter={fmt} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey={metricKey} name={currentMetricLabel} stroke={PALETTE[0]} fill="url(#tg)" strokeWidth={2.5} dot={{ r: 3.5, fill: PALETTE[0] }} />
                    </AreaChart>
                  ) : (
                    <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5A6474" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#5A6474" }} tickFormatter={fmt} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {trendKeys.map((k, i) => (
                        <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      ))}
                    </LineChart>
                  )
                ) : (
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} layout="vertical" verticalAlign="middle" align="right" />
                    <Pie data={byDimension} dataKey="value" nameKey="name" cx="38%" cy="50%" outerRadius={115} innerRadius={45} label={({ percent }) => percent > 0.04 ? (percent * 100).toFixed(0) + "%" : ""} labelLine={false}>
                      {byDimension.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E2E0D8", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#5A6474" }}>
            <span>Alliance University · Central Library · Library Usage Statistics 2025</span>
            <span>{DATA.schools.length} schools · {DATA.vendors.length} databases · {DATA.services.length} services</span>
          </div>
        </div>
      </div>
    </div>
  );
}
