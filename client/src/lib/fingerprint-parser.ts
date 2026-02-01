import * as XLSX from "xlsx";
import { format, parse as parseDate, isValid } from "date-fns";

export type ParsedPunch = {
  employeeCode: string;
  punchDate: string;
  punchTime: string;
  punchDateTimeKey: string;
  punchSeconds: number;
};

export type InvalidPunchRow = {
  rowIndex: number;
  reason: string;
  raw: Record<string, unknown>;
};

const HEADER_MAP: Record<string, "employeeCode" | "punchDatetime"> = {
  "كود": "employeeCode",
  "التاريخ_والوقت": "punchDatetime",
};

const DATE_FORMATS = [
  "dd/MM/yyyy hh:mm a",
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy H:mm",
  "dd-MM-yyyy hh:mm a",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy H:mm",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
];

const parseExcelDate = (value: unknown): ParsedPunch | null => {
  let y = 0, m = 0, d = 0, H = 0, M = 0, S = 0;

  if (typeof value === "number") {
    const ssf = (XLSX as any).SSF;
    if (!ssf) return null;
    const o = ssf.parse_date_code(value);
    if (!o) return null;
    y = o.y; m = o.m; d = o.d; H = o.H; M = o.M; S = Math.round(o.S || 0);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    let parsed: Date | null = null;
    for (const fmt of DATE_FORMATS) {
      const p = parseDate(trimmed, fmt, new Date());
      if (isValid(p)) {
        parsed = p;
        break;
      }
    }
    if (!parsed) return null;
    y = parsed.getFullYear();
    m = parsed.getMonth() + 1;
    d = parsed.getDate();
    H = parsed.getHours();
    M = parsed.getMinutes();
    S = parsed.getSeconds();
  } else if (value instanceof Date && isValid(value)) {
    y = value.getFullYear();
    m = value.getMonth() + 1;
    d = value.getDate();
    H = value.getHours();
    M = value.getMinutes();
    S = value.getSeconds();
  } else {
    return null;
  }

  // Handle rounding edge case (SSF might return S=60)
  if (S >= 60) { S = 0; M += 1; }
  if (M >= 60) { M = 0; H += 1; }
  if (H >= 24) { H = 23; M = 59; S = 59; } // Clamp to same day

  const punchDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const punchTime = `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")}`;
  const punchSeconds = H * 3600 + M * 60 + S;

  return {
    employeeCode: "", // Filled later
    punchDate,
    punchTime,
    punchDateTimeKey: `${punchDate}T${punchTime}`,
    punchSeconds,
  };
};

const normalizeRow = (headers: string[], values: unknown[]) => {
  const raw: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    raw[String(header).trim()] = values[index];
  });
  return raw;
};

const getMappedValue = (row: Record<string, unknown>, field: "employeeCode" | "punchDatetime") => {
  for (const [header, mapped] of Object.entries(HEADER_MAP)) {
    if (mapped === field && header in row) {
      return row[header];
    }
  }
  return undefined;
};

export const parseFingerprintWorksheet = (worksheet: XLSX.WorkSheet) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: "",
  }) as unknown[][];

  if (rows.length === 0) {
    return { valid: [] as ParsedPunch[], invalid: [] as InvalidPunchRow[] };
  }

  const headers = rows[0].map((header) => String(header).trim());
  const valid: ParsedPunch[] = [];
  const invalid: InvalidPunchRow[] = [];

  rows.slice(1).forEach((rowValues, index) => {
    const raw = normalizeRow(headers, rowValues);
    const rowIndex = index + 2;
    const employeeCodeValue = getMappedValue(raw, "employeeCode");
    const datetimeValue = getMappedValue(raw, "punchDatetime");

    const employeeCode = String(employeeCodeValue || "").trim();
    if (!employeeCode && !datetimeValue) return;

    if (!employeeCode) {
      invalid.push({ rowIndex, reason: "كود الموظف مفقود", raw });
      return;
    }

    const result = parseExcelDate(datetimeValue);
    if (!result) {
      invalid.push({ rowIndex, reason: "تاريخ/وقت غير صالح", raw });
      return;
    }

    valid.push({
      ...result,
      employeeCode,
    });
  });

  return { valid, invalid };
};
