import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

import {
  BarChart2,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Library,
  BookOpen,
  Database,
  Users,
  Activity,
  Download,
  Upload,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";

import * as XLSX from "xlsx";

import { REAL_DATA } from "./data";
import {
  loadLocalData,
  saveLocalData,
  resetLocalData,
  addUploadHistory,
  loadUploadHistory
} from "./localData";


const PALETTE = [
  "#1F3A5F",
  "#C08A2E",
  "#5B7C99",
  "#8C6A3F",
  "#3D5A73",
  "#A67C3D",
  "#274B6D",
  "#B8965A",
  "#4A7BA7"
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const MONTH_NUMBER = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
};


function monthIdx(month) {
  return MONTHS.indexOf(month);
}


function fmt(n) {
  return n >= 1000
    ? (n / 1000).toFixed(1) + "K"
    : String(n);
}


function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim()
  );

  return Number.isFinite(number) ? number : 0;
}


function normalizeMonth(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /*
   * Excel may return a real JavaScript Date when cellDates:true
   * is used during workbook parsing.
   */
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return MONTHS[value.getMonth()];
  }

  const text = String(value).trim();

  const lower = text.toLowerCase();

  const monthMatch = MONTHS.find(
    (month) =>
      month.toLowerCase() === lower ||
      lower.startsWith(month.toLowerCase()) ||
      new RegExp(`\\b${month}\\b`, "i").test(text)
  );

  return monthMatch || null;
}


function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E0D8",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,.08)"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 4,
          color: "#1B2432"
        }}
      >
        {label}
      </div>

      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color,
            display: "flex",
            gap: 6
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {p.name}:
          </span>

          <span>
            {Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}


const CHART_TYPES = [
  {
    key: "compare",
    label: "Compare",
    icon: BarChart2,
    desc: "Bar by category"
  },
  {
    key: "trend",
    label: "Trend",
    icon: LineIcon,
    desc: "Line over time"
  },
  {
    key: "share",
    label: "Share",
    icon: PieIcon,
    desc: "Pie breakdown"
  }
];


function buildDomains(DATA) {
  return {
    circulation: {
      label: "Circulation & Gate Entry",
      icon: BookOpen,
      dimensionKey: "school",
      dimensionLabel: "School",
      dimensions: DATA.schools || [],
      metrics: [
        {
          key: "issue",
          label: "Books Issued"
        },
        {
          key: "renewal",
          label: "Renewals"
        },
        {
          key: "return",
          label: "Returns"
        },
        {
          key: "gate_entry",
          label: "Gate Entries"
        }
      ],
      rows: DATA.circulation || []
    },

    database: {
      label: "Database Usage",
      icon: Database,
      dimensionKey: "vendor",
      dimensionLabel: "Vendor",
      dimensions: DATA.vendors || [],
      metrics: [
        {
          key: "searches",
          label: "Searches"
        },
        {
          key: "downloads",
          label: "Downloads"
        },
        {
          key: "total",
          label: "Total Activity"
        }
      ],
      rows: DATA.db_usage || [],
      categoryKey: "category"
    },

    services: {
      label: "Library Services",
      icon: Users,
      dimensionKey: "service",
      dimensionLabel: "Service",
      dimensions: DATA.services || [],
      metrics: [
        {
          key: "value",
          label: "Usage Count"
        }
      ],
      rows: DATA.svc_usage || []
    },

    online: {
      label: "Online Resources",
      icon: Activity,
      dimensionKey: "month",
      dimensionLabel: "Month",
      dimensions: DATA.months || [],
      metrics: [
        {
          key: "opac_views",
          label: "OPAC Page Views"
        },
        {
          key: "digital_library",
          label: "Digital Library"
        },
        {
          key: "databases",
          label: "Databases Accessed"
        },
        {
          key: "idp_access",
          label: "IDP Remote Access"
        }
      ],
      rows: DATA.online_resources || [],
      isTimeSeries: true
    }
  };
}


/*
 * Convert a worksheet into plain objects.
 */
function worksheetToObjects(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: ""
  });
}


/*
 * Flexible field lookup.
 *
 * This allows Excel headings such as:
 * "School", "school", "School Name", etc.
 */
function getField(row, aliases) {
  const keys = Object.keys(row);

  const normalized = {};

  keys.forEach((key) => {
    normalized[
      String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    ] = row[key];
  });

  for (const alias of aliases) {
    const normalizedAlias = alias
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (normalizedAlias in normalized) {
      return normalized[normalizedAlias];
    }
  }

  return "";
}


/*
 * Parse one sheet into circulation rows.
 */
function parseCirculation(rows) {
  return rows
    .map((row) => {
      const month = normalizeMonth(
        getField(row, [
          "month",
          "date",
          "Month Name"
        ])
      );

      const school = getField(row, [
        "school",
        "school name",
        "schoolname"
      ]);

      if (!month || !school) {
        return null;
      }

      return {
        month,
        school: String(school).trim(),

        issue: normalizeNumber(
          getField(row, [
            "issue",
            "issues",
            "books issued",
            "booksissued"
          ])
        ),

        renewal: normalizeNumber(
          getField(row, [
            "renewal",
            "renewals"
          ])
        ),

        return: normalizeNumber(
          getField(row, [
            "return",
            "returns",
            "books returned"
          ])
        ),

        gate_entry: normalizeNumber(
          getField(row, [
            "gate_entry",
            "gate entry",
            "gate entries",
            "gateentries"
          ])
        )
      };
    })
    .filter(Boolean);
}


/*
 * Parse database usage sheet.
 */
function parseDatabase(rows) {
  return rows
    .map((row) => {
      const month = normalizeMonth(
        getField(row, [
          "month",
          "date",
          "Month Name"
        ])
      );

      const vendor = getField(row, [
        "vendor",
        "database",
        "database name",
        "databasename"
      ]);

      if (!month || !vendor) {
        return null;
      }

      const searches = normalizeNumber(
        getField(row, [
          "searches",
          "search"
        ])
      );

      const downloads = normalizeNumber(
        getField(row, [
          "downloads",
          "download"
        ])
      );

      const totalRaw = getField(row, [
        "total",
        "total activity",
        "totalactivity"
      ]);

      const total =
        totalRaw === ""
          ? searches + downloads
          : normalizeNumber(totalRaw);

      return {
        month,
        vendor: String(vendor).trim(),
        searches,
        downloads,
        total,
        category:
          getField(row, [
            "category",
            "discipline"
          ]) || "Multidisciplinary"
      };
    })
    .filter(Boolean);
}


/*
 * Parse library services.
 */
function parseServices(rows) {
  return rows
    .map((row) => {
      const month = normalizeMonth(
        getField(row, [
          "month",
          "date"
        ])
      );

      const service = getField(row, [
        "service",
        "service name",
        "servicename"
      ]);

      if (!month || !service) {
        return null;
      }

      return {
        month,
        service: String(service).trim(),
        value: normalizeNumber(
          getField(row, [
            "value",
            "usage",
            "usage count",
            "usagecount",
            "count"
          ])
        )
      };
    })
    .filter(Boolean);
}


/*
 * Parse online resources.
 */
function parseOnline(rows) {
  return rows
    .map((row) => {
      const month = normalizeMonth(
        getField(row, [
          "month",
          "date"
        ])
      );

      if (!month) {
        return null;
      }

      return {
        month,

        opac_views: normalizeNumber(
          getField(row, [
            "opac_views",
            "opac views",
            "opac page views",
            "opacpageviews"
          ])
        ),

        digital_library: normalizeNumber(
          getField(row, [
            "digital_library",
            "digital library"
          ])
        ),

        databases: normalizeNumber(
          getField(row, [
            "databases",
            "databases accessed"
          ])
        ),

        idp_access: normalizeNumber(
          getField(row, [
            "idp_access",
            "idp access",
            "idp remote access"
          ])
        )
      };
    })
    .filter(Boolean);
}


/*
 * Detect which sheets are available.
 *
 * The prototype accepts these common names.
 */
function findSheetName(workbook, possibleNames) {
  return workbook.SheetNames.find((sheetName) => {
    const normalizedSheet = sheetName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    return possibleNames.some((name) => {
      const normalizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      return (
        normalizedSheet === normalizedName ||
        normalizedSheet.includes(normalizedName)
      );
    });
  });
}



/*
 * ---------------------------------------------------------
 * SMART PARSER FOR THE ORIGINAL ALLIANCE LIBRARY WORKBOOK
 * ---------------------------------------------------------
 *
 * The real workbook is a formatted report rather than a
 * simple row/column table. It contains:
 *
 *   Transactions
 *   Database Usage
 *   Total Usage
 *
 * with multi-row / merged headers.
 *
 * The functions below read that structure while keeping the
 * original table-style parsers above untouched.
 */

function sheetRows(sheet) {
  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true
  });
}


function cleanHeaderText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizedHeader(value) {
  return cleanHeaderText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}


function isUsefulHeader(value) {
  const text = cleanHeaderText(value);

  if (!text) {
    return false;
  }

  if (/^\d+([.,]\d+)?$/.test(text)) {
    return false;
  }

  return true;
}


function headerLooksLike(value, words) {
  const text = normalizedHeader(value);

  return words.some((word) =>
    text.includes(normalizedHeader(word))
  );
}


/*
 * Excel merged cells only store their value in the first
 * cell of the merged range. This helper carries a header
 * value to the right so merged school/vendor/category
 * headers can be read from every column in that group.
 */
function filledHeaderRows(rows, maxHeaderRows = 12) {
  return rows
    .slice(0, Math.min(maxHeaderRows, rows.length))
    .map((row) => {
      const output = [];
      let last = "";

      for (let column = 0; column < row.length; column++) {
        const value = cleanHeaderText(row[column]);

        if (value) {
          last = value;
        }

        output[column] = last;
      }

      return output;
    });
}


function findMonthColumn(rows, maxRows = 20) {
  const limit = Math.min(maxRows, rows.length);
  let bestColumn = 0;
  let bestScore = -1;

  const maxColumns = rows.reduce(
    (max, row) => Math.max(max, row.length),
    0
  );

  for (let column = 0; column < Math.min(maxColumns, 10); column++) {
    let score = 0;

    for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
      if (normalizeMonth(rows[rowIndex]?.[column])) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return bestScore > 0 ? bestColumn : 0;
}


function findHeaderMetricColumn(
  rows,
  metricAliases,
  maxHeaderRows = 12
) {
  const headerRows = Math.min(
    maxHeaderRows,
    rows.length
  );

  const maxColumns = rows.reduce(
    (max, row) => Math.max(max, row.length),
    0
  );

  const matches = [];

  for (let column = 0; column < maxColumns; column++) {
    let metric = null;
    let metricRow = -1;

    for (let rowIndex = 0; rowIndex < headerRows; rowIndex++) {
      const value = cleanHeaderText(
        rows[rowIndex]?.[column]
      );

      if (!value) {
        continue;
      }

      const normalized = normalizedHeader(value);

      const alias = metricAliases.find((item) =>
        normalized.includes(normalizedHeader(item.alias))
      );

      if (alias) {
        metric = alias.key;
        metricRow = rowIndex;
      }
    }

    if (metric) {
      matches.push({
        column,
        metric,
        metricRow
      });
    }
  }

  return matches;
}


function findNearestHeader(
  rows,
  column,
  startRow,
  excludedWords = []
) {
  /*
   * Look upward in the same column first.
   */
  for (
    let rowIndex = startRow;
    rowIndex >= 0;
    rowIndex--
  ) {
    const value = cleanHeaderText(
      rows[rowIndex]?.[column]
    );

    if (
      isUsefulHeader(value) &&
      !headerLooksLike(value, excludedWords)
    ) {
      return {
        value,
        rowIndex
      };
    }
  }

  /*
   * Merged cells often contain the value only in the
   * first column. Search leftwards on each header row.
   */
  for (
    let rowIndex = startRow;
    rowIndex >= 0;
    rowIndex--
  ) {
    for (
      let searchColumn = column;
      searchColumn >= 0;
      searchColumn--
    ) {
      const value = cleanHeaderText(
        rows[rowIndex]?.[searchColumn]
      );

      if (
        isUsefulHeader(value) &&
        !headerLooksLike(value, excludedWords)
      ) {
        return {
          value,
          rowIndex
        };
      }
    }
  }

  return {
    value: "",
    rowIndex: -1
  };
}


function parseFormattedTransactionsSheet(sheet) {
  const rows = sheetRows(sheet);

  if (!rows.length) {
    return [];
  }

  const monthColumn =
    findMonthColumn(rows);

  const metricColumns =
    findHeaderMetricColumn(
      rows,
      [
        {
          key: "gate_entry",
          alias: "gate entry"
        },
        {
          key: "issue",
          alias: "issue"
        },
        {
          key: "renewal",
          alias: "renewal"
        },
        {
          key: "return",
          alias: "return"
        }
      ],
      12
    );

  const result = [];
  const seen = new Set();

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const month =
      normalizeMonth(
        rows[rowIndex]?.[monthColumn]
      );

    if (!month) {
      continue;
    }

    const groups = {};

    for (const item of metricColumns) {
      const schoolHeader =
        findNearestHeader(
          rows,
          item.column,
          item.metricRow - 1,
          [
            "transactions",
            "transaction",
            "month",
            "gate entry",
            "issue",
            "renewal",
            "return",
            "total"
          ]
        );

      const school =
        cleanHeaderText(
          schoolHeader.value
        );

      if (!school) {
        continue;
      }

      /*
       * Ignore title/header text that was picked up
       * instead of an actual school name.
       */
      if (
        headerLooksLike(
          school,
          [
            "transactions",
            "transaction",
            "month",
            "school",
            "total",
            "grand total"
          ]
        )
      ) {
        continue;
      }

      const key = normalizedHeader(school);

      if (!groups[key]) {
        groups[key] = {
          month,
          school,
          issue: 0,
          renewal: 0,
          return: 0,
          gate_entry: 0
        };
      }

      groups[key][item.metric] =
        normalizeNumber(
          rows[rowIndex]?.[item.column]
        );
    }

    Object.values(groups).forEach((record) => {
      const key =
        `${record.month}|${record.school}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(record);
      }
    });
  }

  return result;
}


function parseFormattedDatabaseUsageSheet(sheet) {
  const rows = sheetRows(sheet);

  if (!rows.length) {
    return [];
  }

  const metricColumns =
    findHeaderMetricColumn(
      rows,
      [
        {
          key: "searches",
          alias: "searches"
        },
        {
          key: "downloads",
          alias: "downloads"
        },
        {
          key: "total",
          alias: "total"
        }
      ],
      12
    );

  const monthColumn =
    findMonthColumn(rows);

  const resultMap = new Map();

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const month =
      normalizeMonth(
        rows[rowIndex]?.[monthColumn]
      );

    if (!month) {
      continue;
    }

    for (const item of metricColumns) {
      const vendorHeader =
        findNearestHeader(
          rows,
          item.column,
          item.metricRow - 1,
          [
            "database usage",
            "database",
            "month",
            "searches",
            "downloads",
            "total",
            "grand total"
          ]
        );

      const vendor =
        cleanHeaderText(
          vendorHeader.value
        );

      if (!vendor) {
        continue;
      }

      if (
        headerLooksLike(
          vendor,
          [
            "database usage",
            "database",
            "month",
            "searches",
            "downloads",
            "total",
            "grand total"
          ]
        )
      ) {
        continue;
      }

      /*
       * The category is usually the next meaningful
       * header above the vendor.
       */
      const categoryHeader =
        findNearestHeader(
          rows,
          item.column,
          vendorHeader.rowIndex - 1,
          [
            "database usage",
            "database",
            "month",
            "searches",
            "downloads",
            "total",
            "grand total"
          ]
        );

      const category =
        cleanHeaderText(
          categoryHeader.value
        ) ||
        "Multidisciplinary";

      const key =
        [
          month,
          normalizedHeader(vendor),
          normalizedHeader(category)
        ].join("|");

      if (!resultMap.has(key)) {
        resultMap.set(key, {
          month,
          vendor,
          category,
          searches: 0,
          downloads: 0,
          total: 0
        });
      }

      const record =
        resultMap.get(key);

      record[item.metric] =
        normalizeNumber(
          rows[rowIndex]?.[item.column]
        );
    }
  }

  const result =
    [...resultMap.values()];

  /*
   * Some workbooks leave Total blank while Search +
   * Download are present.
   */
  result.forEach((record) => {
    if (
      record.total === 0 &&
      (record.searches !== 0 ||
        record.downloads !== 0)
    ) {
      record.total =
        record.searches +
        record.downloads;
    }
  });

  return result;
}


function parseFormattedTotalUsageSheet(sheet) {
  const rows = sheetRows(sheet);

  if (!rows.length) {
    return {
      services: [],
      online: []
    };
  }

  const monthColumn =
    findMonthColumn(rows);

  const maxColumns = rows.reduce(
    (max, row) => Math.max(max, row.length),
    0
  );

  const online = {};
  const services = {};

  const onlineDefinitions = [
    {
      key: "opac_views",
      aliases: [
        "opac page views",
        "opac views",
        "opac"
      ]
    },
    {
      key: "digital_library",
      aliases: [
        "digital library usage",
        "digital library"
      ]
    },
    {
      key: "databases",
      aliases: [
        "databases usage",
        "databases accessed",
        "database usage"
      ]
    },
    {
      key: "idp_access",
      aliases: [
        "idp remote access",
        "idp access"
      ]
    }
  ];

  const serviceDefinitions = [
    {
      name: "DDS Service",
      aliases: ["dds"]
    },
    {
      name: "CAS Services",
      aliases: ["cas"]
    },
    {
      name: "DELNET",
      aliases: ["delnet"]
    },
    {
      name: "Library Blog Usage",
      aliases: ["library blog"]
    },
    {
      name: "Photocopy Service",
      aliases: ["photocopy"]
    },
    {
      name: "ILL Service",
      aliases: ["ill"]
    },
    {
      name: "Reference Queries (LQMS)",
      aliases: [
        "reference queries",
        "lqms"
      ]
    },
    {
      name: "User Training Programs",
      aliases: [
        "user training",
        "training programs"
      ]
    }
  ];

  const findColumnByAliases =
    (aliases) => {

      for (
        let column = 0;
        column < maxColumns;
        column++
      ) {
        for (
          let rowIndex = 0;
          rowIndex < Math.min(10, rows.length);
          rowIndex++
        ) {
          const value =
            cleanHeaderText(
              rows[rowIndex]?.[column]
            );

          if (!value) {
            continue;
          }

          if (
            aliases.some((alias) =>
              normalizedHeader(value)
                .includes(
                  normalizedHeader(alias)
                )
            )
          ) {
            return column;
          }
        }
      }

      return -1;
    };

  const onlineColumns =
    onlineDefinitions.map((definition) => ({
      ...definition,
      column:
        findColumnByAliases(
          definition.aliases
        )
    }));

  const serviceColumns =
    serviceDefinitions.map((definition) => ({
      ...definition,
      column:
        findColumnByAliases(
          definition.aliases
        )
    }));

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const month =
      normalizeMonth(
        rows[rowIndex]?.[monthColumn]
      );

    if (!month) {
      continue;
    }

    if (!online[month]) {
      online[month] = {
        month,
        opac_views: 0,
        digital_library: 0,
        databases: 0,
        idp_access: 0
      };
    }

    onlineColumns.forEach((definition) => {
      if (definition.column >= 0) {
        online[month][definition.key] =
          normalizeNumber(
            rows[rowIndex]?.[
              definition.column
            ]
          );
      }
    });

    serviceColumns.forEach((definition) => {
      if (definition.column >= 0) {
        services[
          `${month}|${definition.name}`
        ] = {
          month,
          service: definition.name,
          value: normalizeNumber(
            rows[rowIndex]?.[
              definition.column
            ]
          )
        };
      }
    });
  }

  return {
    services: Object.values(services),
    online: Object.values(online)
  };
}


function parseActualAllianceWorkbook(workbook) {
  const transactions =
    workbook.Sheets["Transactions"];

  const database =
    workbook.Sheets["Database Usage"];

  const totalUsage =
    workbook.Sheets["Total Usage"];

  if (
    !transactions &&
    !database &&
    !totalUsage
  ) {
    return null;
  }

  const parsedTransactions =
    transactions
      ? parseFormattedTransactionsSheet(
          transactions
        )
      : [];

  const parsedDatabase =
    database
      ? parseFormattedDatabaseUsageSheet(
          database
        )
      : [];

  const parsedTotalUsage =
    totalUsage
      ? parseFormattedTotalUsageSheet(
          totalUsage
        )
      : {
          services: [],
          online: []
        };

  const incoming = {
    circulation: parsedTransactions,
    db_usage: parsedDatabase,
    svc_usage:
      parsedTotalUsage.services,
    online_resources:
      parsedTotalUsage.online
  };

  const totalRecords =
    incoming.circulation.length +
    incoming.db_usage.length +
    incoming.svc_usage.length +
    incoming.online_resources.length;

  if (!totalRecords) {
    return null;
  }

  return incoming;
}


/*
 * Merge uploaded month into current dataset.
 *
 * If the same month already exists, replace that month's
 * rows instead of duplicating them.
 */
function mergeMonthlyData(current, incoming) {
  const result = structuredClone(current);

  const incomingMonths = [
    ...new Set([
      ...(incoming.circulation || []).map((r) => r.month),
      ...(incoming.db_usage || []).map((r) => r.month),
      ...(incoming.svc_usage || []).map((r) => r.month),
      ...(incoming.online_resources || []).map((r) => r.month)
    ])
  ];

  if (!incomingMonths.length) {
    throw new Error(
      "No valid month could be detected in the Excel file."
    );
  }

  function replaceMonthRows(existingRows, incomingRows) {
    const cleaned = existingRows.filter(
      (row) => !incomingMonths.includes(row.month)
    );

    return [...cleaned, ...incomingRows];
  }

  result.circulation = replaceMonthRows(
    result.circulation || [],
    incoming.circulation || []
  );

  result.db_usage = replaceMonthRows(
    result.db_usage || [],
    incoming.db_usage || []
  );

  result.svc_usage = replaceMonthRows(
    result.svc_usage || [],
    incoming.svc_usage || []
  );

  result.online_resources = replaceMonthRows(
    result.online_resources || [],
    incoming.online_resources || []
  );

  const schoolSet = new Set(
    result.circulation.map((r) => r.school)
  );

  const vendorSet = new Set(
    result.db_usage.map((r) => r.vendor)
  );

  const serviceSet = new Set(
    result.svc_usage.map((r) => r.service)
  );

  result.schools = [...schoolSet];
  result.vendors = [...vendorSet];
  result.services = [...serviceSet];
  result.months = MONTHS.filter((month) =>
    [
      ...result.circulation,
      ...result.db_usage,
      ...result.svc_usage,
      ...result.online_resources
    ].some((row) => row.month === month)
  );

  return {
    result,
    incomingMonths
  };
}


/*
 * Convert chart data to CSV.
 */
function downloadCSV(rows, filename) {
  if (!rows?.length) {
    alert("There is no data to download.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";

          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(",")
    )
  ].join("\n");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}


/*
 * Download the actual Recharts SVG.
 */
function downloadSVG(chartContainer, filename) {
  const svg = chartContainer?.querySelector("svg");

  if (!svg) {
    alert("Chart is not ready yet.");
    return;
  }

  const clone = svg.cloneNode(true);

  clone.setAttribute(
    "xmlns",
    "http://www.w3.org/2000/svg"
  );

  const serializer = new XMLSerializer();

  const source = serializer.serializeToString(clone);

  const blob = new Blob(
    [source],
    {
      type: "image/svg+xml;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}


/*
 * Convert chart SVG into PNG.
 */
function downloadPNG(chartContainer, filename) {
  const svg = chartContainer?.querySelector("svg");

  if (!svg) {
    alert("Chart is not ready yet.");
    return;
  }

  const clone = svg.cloneNode(true);

  clone.setAttribute(
    "xmlns",
    "http://www.w3.org/2000/svg"
  );

  const serializer = new XMLSerializer();

  const source = serializer.serializeToString(clone);

  const svgBlob = new Blob(
    [source],
    {
      type: "image/svg+xml;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(svgBlob);

  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");

    const scale = 2;

    canvas.width =
      image.width * scale;

    canvas.height =
      image.height * scale;

    const context =
      canvas.getContext("2d");

    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const pngUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = pngUrl;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert("Could not generate PNG.");
  };

  image.src = url;
}


export default function LibraryInsightDashboard() {

  const [DATA, setDATA] =
    useState(() => loadLocalData());

  const [domainKey, setDomainKey] =
    useState("circulation");

  const [chartType, setChartType] =
    useState("compare");

  const [metricKey, setMetricKey] =
    useState("issue");

  const [fromDate, setFromDate] =
    useState("2025-01-01");

  const [toDate, setToDate] =
    useState("2025-12-31");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [uploadMessage, setUploadMessage] =
    useState(null);

  const [uploadError, setUploadError] =
    useState(null);

  const [uploadHistory, setUploadHistory] =
    useState(() => loadUploadHistory());

  const [showUpload, setShowUpload] =
    useState(false);

  const chartRef = useRef(null);

  const domainMap = useMemo(
    () => buildDomains(DATA),
    [DATA]
  );

  const domain =
    domainMap[domainKey];

  /*
   * Keep metric valid when domain changes.
   */
  useEffect(() => {
    const exists =
      domain.metrics.some(
        (metric) => metric.key === metricKey
      );

    if (!exists) {
      setMetricKey(
        domain.metrics[0]?.key
      );
    }
  }, [domain, metricKey]);


  /*
   * Save data whenever it changes.
   */
  useEffect(() => {
    saveLocalData(DATA);
  }, [DATA]);


  function handleDomainChange(key) {
    const nextDomain =
      domainMap[key];

    setDomainKey(key);

    setMetricKey(
      nextDomain.metrics[0].key
    );

    setCategoryFilter("All");

    setChartType("compare");
  }


  /*
   * Convert selected date into month index.
   */
  const selectedFrom =
    fromDate
      ? new Date(`${fromDate}T00:00:00`)
      : null;

  const selectedTo =
    toDate
      ? new Date(`${toDate}T00:00:00`)
      : null;


  const dateError =
    !selectedFrom ||
    Number.isNaN(selectedFrom.getTime())
      ? "Please select a valid start date."
      : !selectedTo ||
        Number.isNaN(selectedTo.getTime())
      ? "Please select a valid end date."
      : selectedFrom > selectedTo
      ? "Start date cannot be after end date."
      : null;


  /*
   * Current prototype contains monthly data.
   *
   * Therefore the calendar selects all months touched
   * by the selected date range.
   */
  const monthsInRange = useMemo(() => {

    if (dateError) {
      return [];
    }

    const months = [];

    const startYear =
      selectedFrom.getFullYear();

    const startMonth =
      selectedFrom.getMonth();

    const endYear =
      selectedTo.getFullYear();

    const endMonth =
      selectedTo.getMonth();

    let year = startYear;
    let month = startMonth;

    while (
      year < endYear ||
      (
        year === endYear &&
        month <= endMonth
      )
    ) {

      /*
       * Current data model is 2025.
       *
       * If another year is uploaded later,
       * this structure can be expanded to use
       * year + month instead of month alone.
       */
      if (year === 2025) {
        months.push(
          MONTHS[month]
        );
      }

      month++;

      if (month > 11) {
        month = 0;
        year++;
      }
    }

    return months;
  }, [
    fromDate,
    toDate,
    dateError
  ]);


  const filteredRows =
    useMemo(() => {

      if (dateError) {
        return [];
      }

      let rows =
        domain.rows.filter(
          (row) =>
            monthsInRange.includes(
              row.month
            )
        );

      if (
        categoryFilter !== "All" &&
        domain.categoryKey
      ) {
        rows =
          rows.filter(
            (row) =>
              row[
                domain.categoryKey
              ] === categoryFilter
          );
      }

      return rows;

    }, [
      domain,
      monthsInRange,
      categoryFilter,
      dateError
    ]);


  const activeDimensions =
    useMemo(() => {

      if (
        domain.categoryKey &&
        categoryFilter !== "All"
      ) {
        return [
          ...new Set(
            filteredRows.map(
              (row) =>
                row[
                  domain.dimensionKey
                ]
            )
          )
        ];
      }

      return domain.dimensions;

    }, [
      domain,
      filteredRows,
      categoryFilter
    ]);


  const byDimension =
    useMemo(() => {

      if (domain.isTimeSeries) {

        return monthsInRange.map(
          (month) => {

            const row =
              domain.rows.find(
                (r) =>
                  r.month === month
              );

            return {
              name: month,
              value: row
                ? row[metricKey] || 0
                : 0
            };
          }
        );
      }

      const map = {};

      filteredRows.forEach(
        (row) => {

          const dimension =
            row[
              domain.dimensionKey
            ];

          map[dimension] =
            (map[dimension] || 0) +
            (row[metricKey] || 0);
        }
      );

      return Object.entries(map)
        .map(
          ([name, value]) => ({
            name,
            value
          })
        )
        .sort(
          (a, b) =>
            b.value - a.value
        );

    }, [
      filteredRows,
      domain,
      metricKey,
      monthsInRange
    ]);


  const topDims =
    useMemo(
      () =>
        byDimension
          .slice(0, 6)
          .map(
            (d) => d.name
          ),
      [byDimension]
    );


  const trendData =
    useMemo(() => {

      if (domain.isTimeSeries) {

        return monthsInRange.map(
          (month) => {

            const row =
              domain.rows.find(
                (r) =>
                  r.month === month
              );

            return {
              month,
              [metricKey]:
                row
                  ? row[metricKey] || 0
                  : 0
            };
          }
        );
      }

      return monthsInRange.map(
        (month) => {

          const entry = {
            month
          };

          let otherTotal = 0;

          activeDimensions.forEach(
            (dimension) => {

              const sourceRows =
                domain.categoryKey &&
                categoryFilter !== "All"
                  ? filteredRows
                  : domain.rows;

              const row =
                sourceRows.find(
                  (r) =>
                    r.month === month &&
                    r[
                      domain.dimensionKey
                    ] === dimension
                );

              const value =
                row
                  ? row[metricKey] || 0
                  : 0;

              if (
                topDims.includes(
                  dimension
                )
              ) {
                entry[dimension] =
                  value;
              } else {
                otherTotal += value;
              }
            }
          );

          if (
            activeDimensions.length >
            topDims.length
          ) {
            entry.Other =
              otherTotal;
          }

          return entry;
        }
      );

    }, [
      monthsInRange,
      domain,
      metricKey,
      topDims,
      activeDimensions,
      filteredRows,
      categoryFilter
    ]);


  const totalValue =
    byDimension.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );


  const peakDim =
    byDimension[0];


  const avgPerMonth =
    monthsInRange.length
      ? Math.round(
          totalValue /
            monthsInRange.length
        )
      : 0;


  const currentMetricLabel =
    domain.metrics.find(
      (metric) =>
        metric.key === metricKey
    )?.label || "";


  const categories =
    domain.categoryKey
      ? [
          "All",
          ...new Set(
            domain.rows.map(
              (row) =>
                row[
                  domain.categoryKey
                ]
            )
          )
        ]
      : [];


  const trendKeys =
    domain.isTimeSeries
      ? [metricKey]
      : [
          ...topDims,
          ...(activeDimensions.length >
          topDims.length
            ? ["Other"]
            : [])
        ];


  /*
   * Excel upload.
   */
  async function handleExcelUpload(event) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return false;
    }

    setUploadMessage(null);
    setUploadError(null);

    try {

      if (
        !file.name
          .toLowerCase()
          .endsWith(".xlsx") &&
        !file.name
          .toLowerCase()
          .endsWith(".xls")
      ) {
        throw new Error(
          "Please upload an Excel file (.xlsx or .xls)."
        );
      }

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: true
        });

      console.log(
        "Excel sheets:",
        workbook.SheetNames
      );


      /*
       * FIRST:
       * Try the real Alliance Library workbook
       * structure:
       *
       * Transactions
       * Database Usage
       * Total Usage
       *
       * SECOND:
       * Fall back to the original table-style
       * parser so the old prototype input format
       * continues to work.
       */
      let incoming =
        parseActualAllianceWorkbook(
          workbook
        );

      if (!incoming) {

        const circulationSheet =
          findSheetName(
            workbook,
            [
              "Transactions",
              "Circulation",
              "Circulation & Gate Entry"
            ]
          );

        const databaseSheet =
          findSheetName(
            workbook,
            [
              "Database Usage",
              "Database"
            ]
          );

        const serviceSheet =
          findSheetName(
            workbook,
            [
              "Total Usage",
              "Library Services",
              "Services"
            ]
          );

        const onlineSheet =
          findSheetName(
            workbook,
            [
              "Online Resources",
              "Online"
            ]
          );

        incoming = {
          circulation: circulationSheet
            ? parseCirculation(
                worksheetToObjects(
                  workbook,
                  circulationSheet
                )
              )
            : [],

          db_usage: databaseSheet
            ? parseDatabase(
                worksheetToObjects(
                  workbook,
                  databaseSheet
                )
              )
            : [],

          svc_usage: serviceSheet
            ? parseServices(
                worksheetToObjects(
                  workbook,
                  serviceSheet
                )
              )
            : [],

          online_resources: onlineSheet
            ? parseOnline(
                worksheetToObjects(
                  workbook,
                  onlineSheet
                )
              )
            : []
        };
      }


      const totalRecords =
        incoming.circulation.length +
        incoming.db_usage.length +
        incoming.svc_usage.length +
        incoming.online_resources.length;


      if (!totalRecords) {
        throw new Error(
          "No usable records were found. Make sure the workbook contains Transactions, Database Usage, or Total Usage data."
        );
      }


      const merged =
        mergeMonthlyData(
          DATA,
          incoming
        );


      setDATA(
        merged.result
      );


      const record = {
        id:
          crypto.randomUUID(),

        fileName:
          file.name,

        uploadedAt:
          new Date().toISOString(),

        months:
          merged.incomingMonths,

        records:
          totalRecords
      };


      addUploadHistory(
        record
      );

      setUploadHistory(
        loadUploadHistory()
      );


      setUploadMessage(
        `Successfully imported ${totalRecords.toLocaleString()} records for ${merged.incomingMonths.join(", ")}.`
      );

      /*
       * Close the modal here, after the import has
       * definitely succeeded. This avoids the old
       * React state timing issue where uploadError
       * could still contain its previous value.
       */
      setShowUpload(false);

      return true;

    } catch (error) {

      console.error(
        "Excel import error:",
        error
      );

      setUploadError(
        error.message ||
          "Excel import failed."
      );

      return false;

    } finally {

      event.target.value = "";
    }
  }


  function handleReset() {

    const confirmed =
      window.confirm(
        "Reset all locally uploaded data and return to the original 2025 dataset?"
      );

    if (!confirmed) {
      return;
    }

    resetLocalData();
  }


  const exportBase =
    `library-insight-${domainKey}-${metricKey}-${chartType}`;


  return (
    <div
      style={{
        background: "#F6F5F1",
        minHeight: "100vh",
        padding: 24,
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color: "#1B2432"
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom:
            "2px solid #E2E0D8",
          flexWrap: "wrap"
        }}
      >

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background:
              "linear-gradient(135deg,#1F3A5F,#16283F)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Library size={22} />
        </div>


        <div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#16283F"
            }}
          >
            Alliance Library — Usage Analytics
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#5A6474",
              marginTop: 2
            }}
          >
            Alliance University · Central Library
          </div>

        </div>


        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap"
          }}
        >

          <button
            type="button"
            onClick={() =>
              setShowUpload(true)
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 13px",
              borderRadius: 9,
              border:
                "1px solid #1F3A5F",
              background: "#1F3A5F",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            <Upload size={15} />
            Upload Monthly Excel
          </button>


          <button
            type="button"
            onClick={handleReset}
            title="Reset local data"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 13px",
              borderRadius: 9,
              border:
                "1px solid #E2E0D8",
              background: "#fff",
              color: "#5A6474",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            <RotateCcw size={15} />
            Reset
          </button>

        </div>

      </div>


      {/* UPLOAD MESSAGE */}

      {uploadMessage && (
        <div
          style={{
            background: "#dcfce7",
            border:
              "1px solid #86efac",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#166534",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={17} />
          {uploadMessage}
        </div>
      )}


      {uploadError && (
        <div
          style={{
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <AlertCircle size={17} />
          {uploadError}
        </div>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "240px 1fr",
          gap: 20
        }}
      >

        {/* SIDEBAR */}

        <div
          style={{
            background: "#fff",
            border:
              "1px solid #E2E0D8",
            borderRadius: 14,
            padding: 18,
            height: "fit-content"
          }}
        >

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#5A6474",
              margin:
                "0 0 8px 2px"
            }}
          >
            Data Domain
          </div>


          {Object.entries(
            domainMap
          ).map(
            ([key, item]) => {

              const Icon =
                item.icon;

              const active =
                domainKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    padding:
                      "10px 12px",
                    borderRadius: 10,
                    border:
                      "1px solid transparent",
                    background:
                      active
                        ? "#1F3A5F"
                        : "transparent",
                    color:
                      active
                        ? "#fff"
                        : "#1B2432",
                    fontSize: 13,
                    cursor:
                      "pointer",
                    marginBottom: 4,
                    fontWeight:
                      active
                        ? 600
                        : 500
                  }}
                  onClick={() =>
                    handleDomainChange(
                      key
                    )
                  }
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            }
          )}


          <div
            style={{
              height: 1,
              background:
                "#E2E0D8",
              margin:
                "14px 0"
            }}
          />


          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
              color: "#5A6474",
              margin:
                "0 0 8px 2px"
            }}
          >
            Metric
          </div>


          <select
            style={{
              width: "100%",
              padding:
                "8px 10px",
              borderRadius: 8,
              border:
                "1px solid #E2E0D8",
              background:
                "#F6F5F1",
              fontSize: 13,
              color: "#1B2432",
              marginBottom: 14,
              fontFamily:
                "inherit"
            }}
            value={metricKey}
            onChange={(event) =>
              setMetricKey(
                event.target.value
              )
            }
          >
            {domain.metrics.map(
              (metric) => (
                <option
                  key={metric.key}
                  value={metric.key}
                >
                  {metric.label}
                </option>
              )
            )}
          </select>


          {/* DATE RANGE */}

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
              color: "#5A6474",
              margin:
                "0 0 8px 2px"
            }}
          >
            Date Range
          </div>


          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#5A6474",
              marginBottom: 4
            }}
          >
            From
          </label>

          <input
            type="date"
            value={fromDate}
            onChange={(event) =>
              setFromDate(
                event.target.value
              )
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding:
                "8px 9px",
              borderRadius: 8,
              border:
                dateError
                  ? "1px solid #dc2626"
                  : "1px solid #E2E0D8",
              background:
                "#FFFFFF",
              color:
                "#1B2432",
              colorScheme:
                "light",
              WebkitTextFillColor:
                "#1B2432",
              fontSize: 13,
              marginBottom: 8
            }}
          />


          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#5A6474",
              marginBottom: 4
            }}
          >
            To
          </label>

          <input
            type="date"
            value={toDate}
            onChange={(event) =>
              setToDate(
                event.target.value
              )
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding:
                "8px 9px",
              borderRadius: 8,
              border:
                dateError
                  ? "1px solid #dc2626"
                  : "1px solid #E2E0D8",
              background:
                "#FFFFFF",
              color:
                "#1B2432",
              colorScheme:
                "light",
              WebkitTextFillColor:
                "#1B2432",
              fontSize: 13,
              marginBottom: 8
            }}
          />


          {dateError && (
            <div
              style={{
                fontSize: 11,
                color: "#b91c1c",
                marginBottom: 10
              }}
            >
              {dateError}
            </div>
          )}


          {!dateError &&
            monthsInRange.length ===
              0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "#b45309",
                  background:
                    "#fffbeb",
                  border:
                    "1px solid #fde68a",
                  padding: 8,
                  borderRadius: 7,
                  marginBottom: 10
                }}
              >
                No uploaded data exists
                for this date range.
              </div>
            )}


          <div
            style={{
              height: 1,
              background:
                "#E2E0D8",
              margin:
                "14px 0"
            }}
          />


          {/* CHART TYPE */}

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
              color: "#5A6474",
              margin:
                "0 0 8px 2px"
            }}
          >
            Chart Type
          </div>


          <div
            style={{
              display: "flex",
              gap: 6
            }}
          >

            {CHART_TYPES.map(
              (chart) => {

                const Icon =
                  chart.icon;

                const active =
                  chartType ===
                  chart.key;

                return (
                  <button
                    key={chart.key}
                    type="button"
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      gap: 4,
                      padding:
                        "10px 4px",
                      borderRadius: 10,
                      border:
                        active
                          ? "1px solid #C08A2E"
                          : "1px solid #E2E0D8",
                      background:
                        active
                          ? "#EFE2C8"
                          : "#F6F5F1",
                      cursor:
                        "pointer",
                      fontSize:
                        10.5,
                      color:
                        active
                          ? "#16283F"
                          : "#5A6474",
                      fontWeight: 600,
                      fontFamily:
                        "inherit"
                    }}
                    onClick={() =>
                      setChartType(
                        chart.key
                      )
                    }
                    title={
                      chart.desc
                    }
                  >
                    <Icon size={14} />
                    {chart.label}
                  </button>
                );
              }
            )}

          </div>

        </div>


        {/* MAIN */}

        <div>

          {/* KPI CARDS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 12,
              marginBottom: 16
            }}
          >

            {[
              [
                "Total — " +
                  currentMetricLabel,

                totalValue.toLocaleString(),

                `${fromDate} → ${toDate}`
              ],

              [
                "Monthly Average",

                avgPerMonth.toLocaleString(),

                "per month in range"
              ],

              [
                "Top " +
                  (domain.isTimeSeries
                    ? "Month"
                    : domain.dimensionLabel),

                peakDim
                  ? peakDim.name
                  : "—",

                peakDim
                  ? `${peakDim.value.toLocaleString()} ${currentMetricLabel.toLowerCase()}`
                  : "No data"
              ]
            ].map(
              ([label, value, sub], i) => (

                <div
                  key={i}
                  style={{
                    background:
                      "#fff",
                    border:
                      "1px solid #E2E0D8",
                    borderRadius: 12,
                    padding:
                      "14px 18px",
                    position:
                      "relative",
                    overflow:
                      "hidden"
                  }}
                >

                  <div
                    style={{
                      position:
                        "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background:
                        "linear-gradient(90deg,#1F3A5F,#C08A2E)"
                    }}
                  />

                  <div
                    style={{
                      fontSize: 10,
                      color:
                        "#5A6474",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.07em",
                      fontWeight: 700
                    }}
                  >
                    {label}
                  </div>

                  <div
                    style={{
                      fontSize:
                        value.length > 6
                          ? 18
                          : 26,
                      fontWeight: 700,
                      color:
                        "#16283F",
                      marginTop: 4
                    }}
                  >
                    {value}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "#5A6474",
                      marginTop: 2
                    }}
                  >
                    {sub}
                  </div>

                </div>

              )
            )}

          </div>


          {/* CATEGORY FILTER */}

          {categories.length >
            0 && (
            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap: 6,
                marginBottom:
                  14
              }}
            >

              {categories.map(
                (category) => {

                  const active =
                    categoryFilter ===
                    category;

                  return (
                    <button
                      key={category}
                      type="button"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding:
                          "4px 10px",
                        borderRadius:
                          999,
                        border:
                          active
                            ? "1px solid #1F3A5F"
                            : "1px solid #E2E0D8",
                        background:
                          active
                            ? "#1F3A5F"
                            : "#F6F5F1",
                        color:
                          active
                            ? "#fff"
                            : "#5A6474",
                        cursor:
                          "pointer",
                        fontFamily:
                          "inherit"
                      }}
                      onClick={() =>
                        setCategoryFilter(
                          category
                        )
                      }
                    >
                      {category}
                    </button>
                  );
                }
              )}

            </div>
          )}


          {/* CHART */}

          <div
            style={{
              background:
                "#fff",
              border:
                "1px solid #E2E0D8",
              borderRadius: 14,
              padding: 18,
              minHeight: 400
            }}
          >

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 12,
                marginBottom:
                  2,
                flexWrap:
                  "wrap"
              }}
            >

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    "#16283F"
                }}
              >
                {currentMetricLabel} by{" "}
                {domain.isTimeSeries
                  ? "Month"
                  : domain.dimensionLabel}

                <span
                  style={{
                    display:
                      "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      "#1F3A5F",
                    background:
                      "#EFE2C8",
                    border:
                      "1px solid #C08A2E",
                    padding:
                      "2px 8px",
                    borderRadius:
                      999,
                    marginLeft: 8,
                    verticalAlign:
                      "middle"
                  }}
                >
                  {fromDate.slice(
                    0,
                    4
                  )}
                </span>
              </div>


              {/* DOWNLOAD */}

              <div
                style={{
                  display:
                    "flex",
                  gap: 6
                }}
              >

                <button
                  type="button"
                  onClick={() =>
                    downloadPNG(
                      chartRef.current,
                      `${exportBase}.png`
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding:
                      "7px 10px",
                    borderRadius:
                      8,
                    border:
                      "1px solid #C9C5BA",
                    background:
                      "#FFFFFF",
                    color:
                      "#1F3A5F",
                    cursor:
                      "pointer",
                    fontSize:
                      11,
                    fontWeight:
                      700
                  }}
                >
                  <Download
                    size={13}
                  />
                  PNG
                </button>


                <button
                  type="button"
                  onClick={() =>
                    downloadSVG(
                      chartRef.current,
                      `${exportBase}.svg`
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding:
                      "7px 10px",
                    borderRadius:
                      8,
                    border:
                      "1px solid #C9C5BA",
                    background:
                      "#FFFFFF",
                    color:
                      "#1F3A5F",
                    cursor:
                      "pointer",
                    fontSize:
                      11,
                    fontWeight:
                      700
                  }}
                >
                  SVG
                </button>


                <button
                  type="button"
                  onClick={() =>
                    downloadCSV(
                      byDimension,
                      `${exportBase}.csv`
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding:
                      "7px 10px",
                    borderRadius:
                      8,
                    border:
                      "1px solid #C9C5BA",
                    background:
                      "#FFFFFF",
                    color:
                      "#1F3A5F",
                    cursor:
                      "pointer",
                    fontSize:
                      11,
                    fontWeight:
                      700
                  }}
                >
                  CSV
                </button>

              </div>

            </div>


            <div
              style={{
                fontSize: 12,
                color:
                  "#5A6474",
                marginBottom:
                  16
              }}
            >
              {chartType ===
                "trend" &&
                !domain.isTimeSeries &&
                "Monthly trend · top " +
                  topDims.length +
                  " " +
                  domain.dimensionLabel.toLowerCase() +
                  " values"}

              {chartType ===
                "trend" &&
                domain.isTimeSeries &&
                "Monthly trend"}

              {chartType ===
                "compare" &&
                "Totals for selected date range, sorted descending"}

              {chartType ===
                "share" &&
                "Proportional breakdown across selected date range"}

            </div>


            {monthsInRange.length ===
            0 ? (

              <div
                style={{
                  height: 320,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color:
                    "#5A6474",
                  fontSize: 13
                }}
              >
                No data available
                for the selected
                date range.
              </div>

            ) : (

              <div
                ref={chartRef}
                style={{
                  height: 320
                }}
              >

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  {chartType ===
                  "compare" ? (

                    <BarChart
                      data={
                        byDimension
                      }
                      margin={{
                        top: 4,
                        right: 16,
                        left: 0,
                        bottom: 60
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E0D8"
                        vertical={
                          false
                        }
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11,
                          fill:
                            "#5A6474"
                        }}
                        angle={
                          -30
                        }
                        textAnchor="end"
                        interval={0}
                        height={70}
                      />

                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill:
                            "#5A6474"
                        }}
                        tickFormatter={
                          fmt
                        }
                        width={50}
                      />

                      <Tooltip
                        content={
                          <CustomTooltip />
                        }
                      />

                      <Bar
                        dataKey="value"
                        name={
                          currentMetricLabel
                        }
                        radius={[
                          5,
                          5,
                          0,
                          0
                        ]}
                      >

                        {byDimension.map(
                          (_, i) => (
                            <Cell
                              key={i}
                              fill={
                                PALETTE[
                                  i %
                                    PALETTE.length
                                ]
                              }
                            />
                          )
                        )}

                      </Bar>

                    </BarChart>

                  ) : chartType ===
                    "trend" ? (

                    domain.isTimeSeries ? (

                      <AreaChart
                        data={
                          trendData
                        }
                        margin={{
                          top: 4,
                          right: 16,
                          left: 0,
                          bottom: 4
                        }}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E0D8"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="month"
                          tick={{
                            fontSize: 11,
                            fill:
                              "#5A6474"
                          }}
                        />

                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill:
                              "#5A6474"
                          }}
                          tickFormatter={
                            fmt
                          }
                          width={50}
                        />

                        <Tooltip
                          content={
                            <CustomTooltip />
                          }
                        />

                        <Area
                          type="monotone"
                          data={
                            undefined
                          }
                          dataKey={
                            metricKey
                          }
                          name={
                            currentMetricLabel
                          }
                          stroke={
                            PALETTE[0]
                          }
                          fill={
                            PALETTE[0]
                          }
                          fillOpacity={
                            0.12
                          }
                          strokeWidth={
                            2.5
                        }
                        />

                      </AreaChart>

                    ) : (

                      <LineChart
                        data={
                          trendData
                        }
                        margin={{
                          top: 4,
                          right: 16,
                          left: 0,
                          bottom: 4
                        }}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E0D8"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="month"
                          tick={{
                            fontSize: 11,
                            fill:
                              "#5A6474"
                          }}
                        />

                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill:
                              "#5A6474"
                          }}
                          tickFormatter={
                            fmt
                          }
                          width={50}
                        />

                        <Tooltip
                          content={
                            <CustomTooltip />
                          }
                        />

                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                            paddingTop: 8
                          }}
                        />

                        {trendKeys.map(
                          (
                            key,
                            i
                          ) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={
                                key
                              }
                              stroke={
                                PALETTE[
                                  i %
                                    PALETTE.length
                                ]
                              }
                              strokeWidth={
                                2
                              }
                              dot={{
                                r: 3
                              }}
                            />
                          )
                        )}

                      </LineChart>

                    )

                  ) : (

                    <PieChart>

                      <Tooltip
                        content={
                          <CustomTooltip />
                        }
                      />

                      <Legend
                        wrapperStyle={{
                          fontSize: 11
                        }}
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                      />

                      <Pie
                        data={
                          byDimension
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="38%"
                        cy="50%"
                        outerRadius={
                          115
                        }
                        innerRadius={
                          45
                        }
                        label={({
                          percent
                        }) =>
                          percent >
                          0.04
                            ? (
                                percent *
                                100
                              ).toFixed(
                                0
                              ) +
                              "%"
                            : ""
                        }
                        labelLine={
                          false
                        }
                      >

                        {byDimension.map(
                          (_, i) => (
                            <Cell
                              key={i}
                              fill={
                                PALETTE[
                                  i %
                                    PALETTE.length
                                ]
                              }
                            />
                          )
                        )}

                      </Pie>

                    </PieChart>

                  )}

                </ResponsiveContainer>

              </div>

            )}

          </div>


          {/* UPLOAD HISTORY */}

          {uploadHistory.length >
            0 && (
            <div
              style={{
                marginTop: 18,
                background:
                  "#fff",
                border:
                  "1px solid #E2E0D8",
                borderRadius: 12,
                padding: 16
              }}
            >

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom:
                    10
                }}
              >
                Recent Excel Imports
              </div>

              {uploadHistory
                .slice(0, 5)
                .map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        padding:
                          "8px 0",
                        borderBottom:
                          "1px solid #F0EEE8",
                        fontSize: 11,
                        color:
                          "#5A6474"
                      }}
                    >
                      <span>
                        {item.fileName}
                      </span>

                      <span>
                        {item.months.join(
                          ", "
                        )}
                      </span>

                      <span>
                        {item.records.toLocaleString()}{" "}
                        records
                      </span>
                    </div>
                  )
                )}

            </div>
          )}


          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop:
                "1px solid #E2E0D8",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              fontSize: 11,
              color:
                "#5A6474",
              flexWrap:
                "wrap",
              gap: 8
            }}
          >
            <span>
              Alliance University · Central Library · Library Usage Analytics
            </span>

            <span>
              {DATA.schools?.length || 0} schools ·{" "}
              {DATA.vendors?.length || 0} databases ·{" "}
              {DATA.services?.length || 0} services
            </span>
          </div>

        </div>

      </div>


      {/* UPLOAD MODAL */}

      {showUpload && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,.45)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 100
          }}
        >

          <div
            style={{
              width:
                "min(600px, 100%)",
              background:
                "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 20px 60px rgba(0,0,0,.2)"
            }}
          >

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                marginBottom:
                  16
              }}
            >

              <div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      "#16283F"
                  }}
                >
                  Upload Monthly Excel
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color:
                      "#5A6474",
                    marginTop: 3
                  }}
                >
                  Upload a monthly workbook
                  to update the dashboard.
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowUpload(false)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                  color:
                    "#5A6474"
                }}
              >
                <X size={20} />
              </button>

            </div>


            <div
              style={{
                background:
                  "#F6F5F1",
                border:
                  "2px dashed #D5D1C7",
                borderRadius:
                  12,
                padding: 30,
                textAlign:
                  "center"
              }}
            >

              <Upload
                size={30}
                color="#1F3A5F"
              />

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: 10
                }}
              >
                Choose Excel File
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    "#5A6474",
                  margin:
                    "5px 0 16px"
                }}
              >
                .xlsx or .xls
              </div>

              <label
                style={{
                  display:
                    "inline-block",
                  background:
                    "#1F3A5F",
                  color:
                    "#fff",
                  padding:
                    "9px 16px",
                  borderRadius: 8,
                  cursor:
                    "pointer",
                  fontSize: 12,
                  fontWeight: 700
                }}
              >

                Browse Excel

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={
                    handleExcelUpload
                  }
                  style={{
                    display:
                      "none"
                  }}
                />

              </label>

            </div>


            <div
              style={{
                marginTop: 16,
                background:
                  "#fffbeb",
                border:
                  "1px solid #fde68a",
                borderRadius: 9,
                padding: 10,
                fontSize: 11,
                color:
                  "#92400e"
              }}
            >
              <strong>
                Prototype mode:
              </strong>{" "}
              imported data is stored locally
              in this browser. No cloud database
              is being used yet.
            </div>

          </div>

        </div>

      )}

    </div>
  );
}