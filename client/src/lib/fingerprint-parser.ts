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

const parseExcelDate = (value: unknown): { punchDate: string, punchTime: string, punchDateTime: string, punchSeconds: number } | null => {
  if (typeof value === "number") {
    // Excel serial math: datePart = floor(serial), timePart = serial - floor(serial)
    const datePart = Math.floor(value);
    const timePart = value - datePart;
    
    // Excel 1900 date system (Date.UTC(1899, 11, 30) handles the 1900 leap year bug correctly for serials)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + datePart * 24 * 60 * 60 * 1000);
    const punchDate = format(d, "yyyy-MM-dd");
    
    // timePart to seconds = round(timeFraction * 86400)
    const punchSeconds = Math.round(timePart * 86400);
    const hours = Math.floor(punchSeconds / 3600);
    const minutes = Math.floor((punchSeconds % 3600) / 60);
    const seconds = punchSeconds % 60;
    const punchTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    
    return { punchDate, punchTime, punchDateTime: `${punchDate}T${punchTime}`, punchSeconds };
  }
  
  if (typeof value === "string") {
    const trimmed = value.trim();
    for (const fmt of DATE_FORMATS) {
      const parsed = parseDate(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        const punchDate = format(parsed, "yyyy-MM-dd");
        const punchTime = format(parsed, "HH:mm:ss");
        const punchSeconds = parsed.getHours() * 3600 + parsed.getMinutes() * 60 + parsed.getSeconds();
        return { punchDate, punchTime, punchDateTime: `${punchDate}T${punchTime}`, punchSeconds };
      }
    }
  }
  
  if (value instanceof Date && isValid(value)) {
    const punchDate = format(value, "yyyy-MM-dd");
    const punchTime = format(value, "HH:mm:ss");
    const punchSeconds = value.getHours() * 3600 + value.getMinutes() * 60 + value.getSeconds();
    return { punchDate, punchTime, punchDateTime: `${punchDate}T${punchTime}`, punchSeconds };
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

    const result = parseExcelDate(datetimeValue);
    if (!result) {
      invalid.push({ rowIndex, reason: "تاريخ/وقت غير صالح", raw });
      return;
    }

    valid.push({
      employeeCode,
      punchDatetime: result.punchDateTime,
      punchDate: result.punchDate,
      punchTime: result.punchTime,
      punchDateTime: result.punchDateTime,
    });
  });

  return { valid, invalid };
};
