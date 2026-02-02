import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/hooks/use-employees";
import { useAttendanceRecords, useProcessAttendance, useToggleFridayCompLeave } from "@/hooks/use-attendance";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import * as XLSX from "xlsx";

type EmployeeRecord = {
  code: string;
  nameAr: string;
  sector?: string | null;
  department?: string | null;
  branch?: string | null;
};

const DEFAULT_MONTH_INPUT = format(new Date(), "MM/yyyy");

export default function FridayControl() {
  const { data: employees } = useEmployees();
  const [monthInput, setMonthInput] = useState(DEFAULT_MONTH_INPUT);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("التحصيل");
  const [branchFilter, setBranchFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const { toast } = useToast();

  const parsedMonth = parse(monthInput, "MM/yyyy", new Date());
  const isValidMonth = !Number.isNaN(parsedMonth.getTime());
  const monthKey = isValidMonth ? format(parsedMonth, "yyyy-MM") : "";
  const startDate = isValidMonth
    ? format(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1), "yyyy-MM-dd")
    : "";
  const endDate = isValidMonth
    ? format(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 0), "yyyy-MM-dd")
    : "";

  const { data: recordsData, isLoading } = useAttendanceRecords(startDate, endDate, "", 1, 0, false);
  const records = recordsData?.data || [];
  const processAttendance = useProcessAttendance();
  const toggleFridayCompLeave = useToggleFridayCompLeave();

  const sectors = useMemo(() => {
    return Array.from(new Set(employees?.map(e => e.sector).filter(Boolean) || []));
  }, [employees]);
  const branches = useMemo(() => {
    return Array.from(new Set(employees?.map(e => e.branch).filter(Boolean) || []));
  }, [employees]);
  const departments = useMemo(() => {
    return Array.from(new Set(employees?.map(e => e.department).filter(Boolean) || []));
  }, [employees]);

  const normalizeArabic = (value: string) =>
    value
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ًٌٍَُِّْ]/g, "")
      .toLowerCase();

  const normalizeDigits = (value: string) => value.replace(/\D/g, "");

  const filteredEmployees = useMemo(() => {
    const list = (employees || []).filter((emp): emp is EmployeeRecord => Boolean(emp.code));
    return list.filter((emp) => {
      if (sectorFilter !== "all" && emp.sector !== sectorFilter) return false;
      if (branchFilter !== "all" && emp.branch !== branchFilter) return false;
      if (departmentFilter !== "all" && emp.department !== departmentFilter) return false;

      if (!search.trim()) return true;
      const normalizedSearch = normalizeArabic(search.trim());
      const normalizedDigits = normalizeDigits(search.trim());
      const haystack = [
        emp.code,
        emp.nameAr,
        emp.sector || "",
        emp.department || "",
        emp.branch || "",
      ]
        .join(" ")
        .toLowerCase();
      const arabicHaystack = normalizeArabic(haystack);
      if (normalizedDigits && normalizeDigits(emp.code).includes(normalizedDigits)) return true;
      return arabicHaystack.includes(normalizedSearch);
    });
  }, [employees, sectorFilter, branchFilter, departmentFilter, search]);

  const fridayDates = useMemo(() => {
    if (!isValidMonth) return [];
    const dates: string[] = [];
    const start = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1);
    const end = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 5) {
        dates.push(format(d, "yyyy-MM-dd"));
      }
    }
    return dates;
  }, [parsedMonth]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    records.forEach((record: any) => {
      map.set(`${record.employeeCode}-${record.date}`, record);
    });
    return map;
  }, [records]);

  const handleProcessMonth = () => {
    if (!isValidMonth) {
      toast({ title: "تنبيه", description: "يرجى إدخال شهر صحيح (MM/YYYY)", variant: "destructive" });
      return;
    }
    processAttendance.mutate({ startDate, endDate }, {
      onSuccess: (data: any) => toast({ title: "تمت المعالجة", description: data.message }),
    });
  };

  const handleToggle = async (recordId: number, enabled: boolean) => {
    try {
      await toggleFridayCompLeave.mutateAsync({
        id: recordId,
        enabled,
        updatedBy: "يدوي",
      });
      toast({ title: "تم الحفظ", description: "تم تحديث حالة الجمعة بنجاح" });
    } catch (err: any) {
      toast({ title: "فشل الحفظ", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!isValidMonth) {
      toast({ title: "تنبيه", description: "يرجى إدخال شهر صحيح (MM/YYYY)", variant: "destructive" });
      return;
    }
    const rows: Record<string, unknown>[] = [];
    fridayDates.forEach((date) => {
      filteredEmployees.forEach((employee) => {
        const record = attendanceMap.get(`${employee.code}-${date}`);
        rows.push({
          employee_code: employee.code,
          employee_name: employee.nameAr,
          month: monthKey,
          friday_date: date,
          is_friday_leave: record?.fridayCompLeave ? 1 : 0,
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "friday_control");
    XLSX.writeFile(workbook, "friday_control.xlsx");
    toast({ title: "تم التصدير", description: "تم تحميل ملف friday_control.xlsx" });
  };

  const handleImport = async (file: File) => {
    if (!isValidMonth) {
      toast({ title: "تنبيه", description: "يرجى إدخال شهر صحيح (MM/YYYY)", variant: "destructive" });
      return;
    }
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const updates = rows.map((row: any) => ({
      employeeCode: String(row.employee_code || row["employee_code"] || ""),
      date: String(row.friday_date || row["friday_date"] || ""),
      enabled: String(row.is_friday_leave || row["is_friday_leave"] || "0") === "1",
    }));

    let updated = 0;
    for (const update of updates) {
      const record = attendanceMap.get(`${update.employeeCode}-${update.date}`);
      if (!record) continue;
      await toggleFridayCompLeave.mutateAsync({
        id: record.id,
        enabled: update.enabled,
        updatedBy: "استيراد",
        note: "friday_control.xlsx",
      });
      updated += 1;
    }
    toast({ title: "تم الاستيراد", description: `تم تحديث ${updated} سجل` });
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="إدارة الجمع - بدل الجمعة" />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              <div>
                <label className="text-sm font-medium">الشهر (MM/YYYY)</label>
                <Input
                  className="mt-1 w-40"
                  type="text"
                  value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">بحث بالاسم/الكود/الإدارة</label>
                <Input
                  className="mt-1"
                  placeholder="ابحث بالكود أو الاسم أو القطاع"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">القطاع</label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="mt-1 w-48">
                    <SelectValue placeholder="القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل القطاعات</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector as string}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الفرع</label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="mt-1 w-48">
                    <SelectValue placeholder="الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch as string}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الإدارة</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="mt-1 w-48">
                    <SelectValue placeholder="الإدارة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الإدارات</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department as string}>{department}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleProcessMonth} disabled={processAttendance.isPending}>
                معالجة الشهر
              </Button>
              <Button variant="outline" onClick={handleExport}>تصدير التحكم</Button>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <span className="px-3 py-2 border border-border rounded-lg cursor-pointer bg-white">
                  استيراد التحكم
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {fridayDates.map((date) => (
              <div key={date} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <h3 className="text-lg font-bold">الجمعة {date}</h3>
                  <span className="text-sm text-muted-foreground">
                    {filteredEmployees.length} موظف
                  </span>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm text-right min-w-[900px]">
                    <thead className="bg-slate-50 text-muted-foreground font-medium">
                      <tr>
                        <th className="px-4 py-3">الكود</th>
                        <th className="px-4 py-3">الاسم</th>
                        <th className="px-4 py-3">القطاع</th>
                        <th className="px-4 py-3">الإدارة</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3">آخر تعديل</th>
                        <th className="px-4 py-3">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredEmployees.map((employee) => {
                        const record = attendanceMap.get(`${employee.code}-${date}`);
                        return (
                          <tr key={`${employee.code}-${date}`}>
                            <td className="px-4 py-3 font-mono">{employee.code}</td>
                            <td className="px-4 py-3 font-medium">{employee.nameAr}</td>
                            <td className="px-4 py-3">{employee.sector || "-"}</td>
                            <td className="px-4 py-3">{employee.department || "-"}</td>
                            <td className="px-4 py-3">
                              {record ? (
                                record.fridayCompLeave ? (
                                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                    إجازة بدل الجمعة
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                    جمعة شغل
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">غير معالج</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {record?.fridayCompLeaveUpdatedBy || "-"}
                              {record?.fridayCompLeaveNote ? ` · ${record.fridayCompLeaveNote}` : ""}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!record || toggleFridayCompLeave.isPending}
                                onClick={() => record && handleToggle(record.id, !record.fridayCompLeave)}
                              >
                                {record?.fridayCompLeave ? "جمعة شغل" : "إجازة بدل الجمعة"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground mt-4">جاري تحميل البيانات...</div>
          )}
        </main>
      </div>
    </div>
  );
}
