import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Plus, FileText, CheckCircle2 } from "lucide-react";
import { useAdjustments } from "@/hooks/use-data";
import { Badge } from "@/components/ui/badge";

export default function Adjustments() {
  const { data: adjustments, isLoading } = useAdjustments();

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="التسويات والإجازات" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-display">سجل الإجازات والمهمات</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                طلب جديد
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-600">كود الموظف</th>
                    <th className="px-6 py-4 font-bold text-slate-600">النوع</th>
                    <th className="px-6 py-4 font-bold text-slate-600">من تاريخ</th>
                    <th className="px-6 py-4 font-bold text-slate-600">إلى تاريخ</th>
                    <th className="px-6 py-4 font-bold text-slate-600">الحالة</th>
                    <th className="px-6 py-4 font-bold text-slate-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-4 h-12 bg-slate-50/50"></td>
                      </tr>
                    ))
                  ) : adjustments?.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{adj.employeeCode}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {adj.type === 'annual' ? 'إجازة سنوية' : adj.type === 'sick' ? 'إجازة مرضي' : adj.type === 'mission' ? 'مأمورية' : adj.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{adj.startDate}</td>
                      <td className="px-6 py-4 text-muted-foreground">{adj.endDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          مقبول
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
                          <FileText className="w-4 h-4" />
                          عرض
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {adjustments?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        لا يوجد سجلات حالياً
                      </td>
                    </tr>
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
