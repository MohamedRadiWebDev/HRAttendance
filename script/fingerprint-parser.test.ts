import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseFingerprintWorksheet } from "../client/src/lib/fingerprint-parser";

const buildSheet = (rows: unknown[][]) => XLSX.utils.aoa_to_sheet(rows);

const runTests = () => {
  {
    const sheet = buildSheet([
      ["كود", "التاريخ_والوقت"],
      [101, new Date(2025, 11, 16, 0, 6, 0)],
    ]);
    const result = parseFingerprintWorksheet(sheet);
    assert.equal(result.valid.length, 1);
    assert.equal(result.invalid.length, 0);
    assert.equal(result.valid[0].employeeCode, "101");
    assert.equal(result.valid[0].punchDate, "2025-12-16");
    assert.equal(result.valid[0].punchTime, "00:06:00");
  }

  {
    const sheet = buildSheet([
      ["كود", "التاريخ_والوقت"],
      ["102", "16/12/2025 12:06 AM"],
    ]);
    const result = parseFingerprintWorksheet(sheet);
    assert.equal(result.valid.length, 1);
    assert.equal(result.invalid.length, 0);
    assert.equal(result.valid[0].punchDate, "2025-12-16");
    assert.equal(result.valid[0].punchTime, "00:06:00");
  }

  {
    const sheet = buildSheet([
      ["كود", "التاريخ_والوقت"],
      ["", ""],
      ["103", ""],
    ]);
    const result = parseFingerprintWorksheet(sheet);
    assert.equal(result.valid.length, 0);
    assert.equal(result.invalid.length, 1);
    assert.equal(result.invalid[0].reason, "تاريخ/وقت غير صالح");
  }
};

runTests();
console.log("fingerprint-parser tests passed");
