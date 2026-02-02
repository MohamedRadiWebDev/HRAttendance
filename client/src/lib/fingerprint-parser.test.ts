import { parseFingerprintWorksheet } from "./fingerprint-parser";
import * as XLSX from "xlsx";

describe("Fingerprint Parser", () => {
  it("should parse Excel serial 46000.0041666667 (00:06 AM) as same day", () => {
    // 46000 is 2025-12-16
    const ws = XLSX.utils.aoa_to_sheet([
      ["كود", "التاريخ_والوقت"],
      ["101", 46000.0041666667]
    ]);
    const result = parseFingerprintWorksheet(ws);
    expect(result.valid[0].punchDate).toBe("2025-12-16");
    expect(result.valid[0].punchTime).toBe("00:06:00");
    expect(result.valid[0].punchDateTimeKey).toBe("2025-12-16T00:06:00");
    expect(result.valid[0].punchDateTimeKey).not.toContain("Z");
  });

  it("should parse text dd/MM/yyyy HH:mm correctly", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["كود", "التاريخ_والوقت"],
      ["101", "16/12/2025 12:06 AM"]
    ]);
    const result = parseFingerprintWorksheet(ws);
    expect(result.valid[0].punchDate).toBe("2025-12-16");
    expect(result.valid[0].punchTime).toBe("00:06:00");
  });
});
