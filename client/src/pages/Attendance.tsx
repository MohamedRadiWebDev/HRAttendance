import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, RefreshCw, Download, Search } from "lucide-react";
import { useAttendanceRecords, useProcessAttendance } from "@/hooks/use-attendance";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function Attendance() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });
  const [employeeFilter, setEmployeeFilter] = useState("");
  
  const { data: records, isLoading } = useAttendanceRecords(dateRange.start, dateRange.end, employeeFilter);
  const processAttendance = useProcessAttendance();
  const { toast } = useToast();

  const handleProcess = () => {
    processAttendance.mutate({ startDate: dateRange.start, endDate: dateRange.end }, {
      onSuccess: (data) => {
        toast({ title: "اكتملت المعالجة", description: data.message });
      }
    });
  };

  const handleExport = () => {
    if (!records || records.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `Attendance_${dateRange.start}_${dateRange.end}.xlsx`);
    toast({ title: "تم التصدير", description: "تم تحميل ملف الإكسل بنجاح" });
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="الحضور والانصراف" />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-50 border border-border rounded-lg p-1">
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="border-none bg-transparent h-8 w-36"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="border-none bg-transparent h-8 w-36"
                  />
                </div>
                <div className="relative w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="بحث بالأكواد (101, 102)..." 
                    className="pr-10 h-10"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleProcess} disabled={processAttendance.isPending} className="gap-2">
                  <RefreshCw className={cn("w-4 h-4", processAttendance.isPending && "animate-spin")} />
                  معالجة الحضور
                </Button>
                <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  تصدير التقرير
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-right min-w-[1000px]">
                <thead className="bg-slate-50 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">التاريخ</th>
                    <th className="px-6 py-4">الموظف</th>
                    <th className="px-6 py-4">الدخول</th>
                    <th className="px-6 py-4">الخروج</th>
                    <th className="px-6 py-4">ساعات العمل</th>
                    <th className="px-6 py-4">الإضافي</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center">جاري تحميل البيانات...</td></tr>
                  ) : records?.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">لا توجد سجلات في هذه الفترة</td></tr>
                  ) : (
                    records?.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-muted-foreground">{record.date}</td>
                        <td className="px-6 py-4 font-medium">{record.employeeCode}</td>
                        <td className="px-6 py-4 font-mono" dir="ltr">
                          {record.checkIn ? format(new Date(record.checkIn), "HH:mm") : "-"}
                        </td>
                        <td className="px-6 py-4 font-mono" dir="ltr">
                          {record.checkOut ? format(new Date(record.checkOut), "HH:mm") : "-"}
                        </td>
                        <td className="px-6 py-4 font-bold">{record.totalHours?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">
                          {record.overtimeHours && record.overtimeHours > 0 ? `+${record.overtimeHours.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} isOvernight={record.isOvernight} />
                        </td>
                        <td className="px-6 py-4">
                          {record.penalties && Array.isArray(record.penalties) && record.penalties.length > 0 && (
                            <div className="flex gap-1">
                              {(record.penalties as any[]).map((p: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                                  {typeof p === 'object' ? String(p.type || JSON.stringify(p)) : String(p)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status, isOvernight }: { status: string | null, isOvernight: boolean | null }) {
  const styles: Record<string, string> = {
    "Present": "status-present",
    "Absent": "status-absent",
    "Late": "status-late",
    "Excused": "status-excused",
  };
  
  const labels: Record<string, string> = {
    "Present": "حضور",
    "Absent": "غياب",
    "Late": "تأخير",
    "Excused": "مأذون",
  };

  const baseStyle = styles[status || ""] || "bg-slate-100 text-slate-600";
  const label = labels[status || ""] || status || "-";

  return (
    <div className="flex items-center gap-2">
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", baseStyle)}>
        {label}
      </span>
      {isOvernight && (
        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
          ليلي
        </span>
      )}
    </div>
  );
}
