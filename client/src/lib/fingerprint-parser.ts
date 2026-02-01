import * as XLSX from "xlsx";
import { format, parse as parseDate, isValid } from "date-fns";

export type ParsedPunch = {
  employeeCode: string;
  punchDatetime: string;
  punchDate: string;
  punchTime: string;
  punchDateTime: string;
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

const parseExcelDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    const ssf = (XLSX as typeof XLSX & { SSF?: { parse_date_code?: (v: number) => any } }).SSF;
    if (ssf?.parse_date_code) {
      const parsed = ssf.parse_date_code(value);
      if (!parsed) return null;
      return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S || 0);
    }
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    for (const fmt of DATE_FORMATS) {
      const parsed = parseDate(trimmed, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    const fallback = new Date(trimmed);
    if (isValid(fallback)) return fallback;
  }
  return null;
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
    const hasAnyValue = employeeCode || String(datetimeValue || "").trim();
    if (!hasAnyValue) return;

    if (!employeeCode) {
      invalid.push({ rowIndex, reason: "كود الموظف مفقود", raw });
      return;
    }

    const parsedDate = parseExcelDate(datetimeValue);
    if (!parsedDate || !isValid(parsedDate)) {
      invalid.push({ rowIndex, reason: "تاريخ/وقت غير صالح", raw });
      return;
    }

    valid.push({
      employeeCode,
      punchDatetime: parsedDate.toISOString(),
      punchDate: format(parsedDate, "yyyy-MM-dd"),
      punchTime: format(parsedDate, "HH:mm:ss"),
      punchDateTime: format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss"),
    });
  });

  return { valid, invalid };
};
