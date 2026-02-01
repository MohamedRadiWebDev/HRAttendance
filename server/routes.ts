import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertEmployeeSchema, insertTemplateSchema, insertRuleSchema, insertAdjustmentSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const parseOffsetMinutes = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const toLocalDate = (date: Date, offsetMinutes: number) =>
    new Date(date.getTime() - offsetMinutes * 60 * 1000);
  const formatDateWithOffset = (date: Date, offsetMinutes: number) => {
    const local = toLocalDate(date, offsetMinutes);
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, "0");
    const day = String(local.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const formatUtcDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const parseEmployeeDate = (value?: string | null) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const parts = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!parts) return null;
    const [, day, month, year] = parts;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // Employees
  app.get(api.employees.list.path, async (req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  app.post(api.employees.create.path, async (req, res) => {
    try {
      const input = api.employees.create.input.parse(req.body);
      const employee = await storage.createEmployee(input);
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.employees.get.path, async (req, res) => {
    const employee = await storage.getEmployee(Number(req.params.id));
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  });

  app.put(api.employees.update.path, async (req, res) => {
    try {
      const input = api.employees.update.input.parse(req.body);
      const employee = await storage.updateEmployee(Number(req.params.id), input);
      res.json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Templates
  app.get(api.templates.list.path, async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.post(api.templates.create.path, async (req, res) => {
    try {
      const input = api.templates.create.input.parse(req.body);
      const template = await storage.createTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      throw err;
    }
  });

  app.delete(api.templates.delete.path, async (req, res) => {
    await storage.deleteTemplate(Number(req.params.id));
    res.status(204).end();
  });

  // Rules
  app.get(api.rules.list.path, async (req, res) => {
    const rules = await storage.getRules();
    res.json(rules);
  });

  app.post(api.rules.create.path, async (req, res) => {
    try {
      const input = api.rules.create.input.parse(req.body);
      const rule = await storage.createRule(input);
      res.status(201).json(rule);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.rules.delete.path, async (req, res) => {
    await storage.deleteRule(Number(req.params.id));
    res.status(204).end();
  });

  // Adjustments
  app.get(api.adjustments.list.path, async (req, res) => {
    const adjustments = await storage.getAdjustments();
    res.json(adjustments);
  });

  app.post(api.adjustments.create.path, async (req, res) => {
    try {
      const input = api.adjustments.create.input.parse(req.body);
      const adj = await storage.createAdjustment(input);
      res.status(201).json(adj);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Attendance
  app.get(api.attendance.list.path, async (req, res) => {
    const { startDate, endDate, employeeCode, page = 1, limit = 50 } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start and End dates required" });
    }
    const limitNumber = Number(limit);
    const safeLimit = Number.isFinite(limitNumber) ? limitNumber : 0;
    const offset = safeLimit > 0 ? (Number(page) - 1) * safeLimit : 0;
    const { data, total } = await storage.getAttendance(
      String(startDate), 
      String(endDate), 
      employeeCode as string,
      safeLimit,
      offset
    );
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  });

  app.post(api.attendance.process.path, async (req, res) => {
    const { startDate, endDate, timezoneOffsetMinutes } = req.body;
    try {
      const offsetMinutes = parseOffsetMinutes(timezoneOffsetMinutes);
      const formatDate = (date: Date) => formatDateWithOffset(date, offsetMinutes);
      const formatLocalDay = (date: Date) => formatUtcDate(date);

      const allEmployees = await storage.getEmployees();
      const rules = await storage.getRules();
      const adjustments = await storage.getAdjustments();

      const start = new Date(startDate);
      const end = new Date(endDate);
      const startLocal = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate()
      ));
      const endLocal = new Date(Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate()
      ));

      const punchStartUtc = Date.UTC(
        startLocal.getUTCFullYear(),
        startLocal.getUTCMonth(),
        startLocal.getUTCDate()
      ) + offsetMinutes * 60 * 1000;
      const punchEndUtc = Date.UTC(
        endLocal.getUTCFullYear(),
        endLocal.getUTCMonth(),
        endLocal.getUTCDate()
      ) + offsetMinutes * 60 * 1000 + (24 * 60 * 60 * 1000 - 1);
      const punchStart = new Date(punchStartUtc);
      const punchEnd = new Date(punchEndUtc);
      const punches = await storage.getPunches(punchStart, punchEnd);
      const existingRecords = await storage.getAttendanceByRange(startDate, endDate);

      const adjustmentsByEmployee = new Map<string, typeof adjustments>();
      for (const adj of adjustments) {
        const list = adjustmentsByEmployee.get(adj.employeeCode) || [];
        list.push(adj);
        adjustmentsByEmployee.set(adj.employeeCode, list);
      }

      const punchesByEmployeeDay = new Map<string, typeof punches>();
      for (const punch of punches) {
        // Use the ISO string from DB (local wall-clock date/time) to group
        const punchLocal = punch.punchDatetime;
        const year = punchLocal.getUTCFullYear();
        const month = String(punchLocal.getUTCMonth() + 1).padStart(2, "0");
        const day = String(punchLocal.getUTCDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        
        const key = `${punch.employeeCode}-${dateStr}`;
        const list = punchesByEmployeeDay.get(key) || [];
        list.push(punch);
        punchesByEmployeeDay.set(key, list);
      }

      const existingMap = new Map<string, (typeof existingRecords)[number]>();
      for (const record of existingRecords) {
        const key = `${record.employeeCode}-${record.date}`;
        existingMap.set(key, record);
      }

      const getActiveRules = (employee: (typeof allEmployees)[number], dateStr: string) => {
        return rules.filter(r => {
          const ruleStart = new Date(r.startDate);
          const ruleEnd = new Date(r.endDate);
          const current = new Date(dateStr);
          if (current < ruleStart || current > ruleEnd) return false;
          if (r.scope === 'all') return true;
          if (r.scope.startsWith('dept:') && employee.department === r.scope.replace('dept:', '')) return true;
          if (r.scope.startsWith('sector:') && employee.sector === r.scope.replace('sector:', '')) return true;
          if (r.scope.startsWith('emp:') && employee.code === r.scope.replace('emp:', '')) return true;
          return false;
        }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
      };

      const getAdjustmentForDate = (employeeCode: string, dateStr: string) => {
        const list = adjustmentsByEmployee.get(employeeCode) || [];
        return list.find(a => dateStr >= a.startDate && dateStr <= a.endDate) || null;
      };

      let processedCount = 0;

      for (const employee of allEmployees) {
        for (let d = new Date(startLocal); d <= endLocal; d.setUTCDate(d.getUTCDate() + 1)) {
          const dateStr = formatLocalDay(d);

          const activeRules = getActiveRules(employee, dateStr);
          const isAttendanceExempt = activeRules.some(r => r.ruleType === 'attendance_exempt');

          let currentShiftStart = employee.shiftStart || "09:00";
          let currentShiftEnd = "17:00"; // Default 8 hours
          const shiftRule = activeRules.find(r => r.ruleType === 'custom_shift');
          if (shiftRule) {
            currentShiftStart = (shiftRule.params as any).shiftStart || currentShiftStart;
            currentShiftEnd = (shiftRule.params as any).shiftEnd || currentShiftEnd;
          }

          const activeAdj = getAdjustmentForDate(employee.code, dateStr);

          const dayPunches = (punchesByEmployeeDay.get(`${employee.code}-${dateStr}`) || [])
            .sort((a, b) => a.punchDatetime.getTime() - b.punchDatetime.getTime());
          const checkIn = dayPunches.length > 0 ? dayPunches[0].punchDatetime : null;
          const checkOut = dayPunches.length > 1 ? dayPunches[dayPunches.length - 1].punchDatetime : null;

          const existingRecord = existingMap.get(`${employee.code}-${dateStr}`);
          const manualCompLeave = Boolean(existingRecord?.fridayCompLeaveManual);
          const isFriday = new Date(`${dateStr}T00:00:00Z`).getUTCDay() === 5;
          const isCollectionSector = (employee.sector || "") === "التحصيل";

          let fridayCompLeave = false;
          if (manualCompLeave) {
            fridayCompLeave = Boolean(existingRecord?.fridayCompLeave);
          } else if (isFriday && isCollectionSector) {
            fridayCompLeave = true;
          }

          let totalHours = 0;
          if (checkIn && checkOut) {
            totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          }

          let penalties: any[] = [];
          let status = fridayCompLeave || activeAdj ? "Excused" : "Present";
          const shiftStartParts = currentShiftStart.split(':');
          const shiftStartUtc = Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            parseInt(shiftStartParts[0]),
            parseInt(shiftStartParts[1]),
            0
          ) + offsetMinutes * 60 * 1000;

          if (!fridayCompLeave && !activeAdj && checkIn) {
            const diffMs = checkIn.getTime() - shiftStartUtc;
            const lateMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
            if (diffMs > 15 * 60 * 1000) {
              status = "Late";
              let latePenalty = 0;
              if (lateMinutes > 60) latePenalty = 1;
              else if (lateMinutes > 30) latePenalty = 0.5;
              else latePenalty = 0.25;
              penalties.push({ type: "تأخير", value: latePenalty, minutes: lateMinutes });
            } else {
              status = "Present";
            }
          } else if (!fridayCompLeave && !activeAdj && !checkIn) {
            status = "Absent";
            penalties.push({ type: "غياب", value: 1 });
          }

          if (fridayCompLeave) {
            penalties = [];
          }

          await storage.createAttendanceRecord({
            employeeCode: employee.code,
            date: dateStr,
            checkIn,
            checkOut,
            totalHours,
            status,
            overtimeHours: Math.max(0, totalHours - 8),
            penalties,
            isOvernight: activeRules.some(r => r.ruleType === 'overtime_overnight'),
            fridayCompLeave,
            fridayCompLeaveManual: manualCompLeave && fridayCompLeave,
            fridayCompLeaveNote: existingRecord?.fridayCompLeaveNote || null,
            fridayCompLeaveUpdatedBy: existingRecord?.fridayCompLeaveUpdatedBy || null,
          });
          processedCount++;
        }
      }

      res.json({ message: "Processing completed", processedCount });
    } catch (err: any) {
      console.error("Processing Error:", err);
      res.status(500).json({ message: "Failed to process attendance", error: err.message });
    }
  });

  app.patch(api.attendance.fridayCompLeave.path, async (req, res) => {
    const { enabled, note, updatedBy } = api.attendance.fridayCompLeave.input.parse(req.body);
    const recordId = Number(req.params.id);
    const record = await storage.getAttendanceRecord(recordId);
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    const shouldExcuse = enabled;
    const status = shouldExcuse
      ? "Excused"
      : record.status === "Excused"
        ? (record.checkIn ? "Present" : "Absent")
        : record.status;
    const penalties = shouldExcuse ? [] : record.penalties;

    const updated = await storage.updateAttendanceRecord(recordId, {
      fridayCompLeave: enabled,
      fridayCompLeaveManual: enabled,
      fridayCompLeaveNote: note ?? record.fridayCompLeaveNote ?? null,
      fridayCompLeaveUpdatedBy: updatedBy ?? record.fridayCompLeaveUpdatedBy ?? null,
      status,
      penalties: (penalties as any),
    });
    res.json(updated);
  });

  // Import
  app.post(api.import.punches.path, async (req, res) => {
    try {
      const punches = z.array(z.object({
        employeeCode: z.string(),
        punchDatetime: z.string(), // Local YYYY-MM-DDTHH:mm:ss
      })).parse(req.body);
      
      const mappedPunches = punches.map(p => ({
        employeeCode: p.employeeCode,
        // Treat as local wall-clock time. Store as is.
        punchDatetime: new Date(p.punchDatetime + "Z") // Z suffix ensures it's read exactly as the digits say but stored in DB as timestamp
      }));
      
      const result = await storage.createPunchesBulk(mappedPunches);
      res.json({ message: "Imported punches", count: result.length });
    } catch (err) {
      console.error("Import Punches Error:", err);
      res.status(400).json({ message: "Invalid punch data format" });
    }
  });

  app.post(api.import.employees.path, async (req, res) => {
    const employees = req.body;
    const result = await storage.createEmployeesBulk(employees);
    res.json({ message: "Imported employees", count: result.length });
  });

  // Seeding
  const employeesCount = await storage.getEmployees();
  if (employeesCount.length === 0) {
    console.log("Database is empty. Ready for import.");
  }

  // Wiping Data
  app.post("/api/admin/wipe-data", async (req, res) => {
    try {
      await storage.wipeAllData();
      res.json({ message: "تم مسح كافة البيانات بنجاح" });
    } catch (err: any) {
      res.status(500).json({ message: "فشل مسح البيانات", error: err.message });
    }
  });

  return httpServer;
}
