import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Users, Clock, AlertTriangle, CheckCircle, ArrowUpRight } from "lucide-react";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEmployees } from "@/hooks/use-employees";
import { format } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { data: employees } = useEmployees();
  const { data: attendanceData } = useAttendanceRecords(
    format(new Date(), "yyyy-MM-dd"),
    format(new Date(), "yyyy-MM-dd")
  );

  const todayRecords = (attendanceData as any)?.data || [];
  const presentCount = todayRecords.filter((r: any) => r.status === "Present" || r.status === "Late").length;
  const lateCount = todayRecords.filter((r: any) => r.status === "Late").length;
  const absentCount = todayRecords.filter((r: any) => r.status === "Absent").length;
  const excusedCount = todayRecords.filter((r: any) => r.status === "Excused").length;

  const stats = [
    { title: "إجمالي الموظفين", value: employees?.length || 0, icon: Users, color: "blue" as const, trend: "", trendUp: true },
    { title: "حضور اليوم", value: presentCount, icon: CheckCircle, color: "green" as const, trend: "", trendUp: true },
    { title: "تأخيرات", value: lateCount, icon: Clock, color: "orange" as const, trend: "", trendUp: true },
    { title: "غياب", value: absentCount, icon: AlertTriangle, color: "red" as const, trend: "", trendUp: false },
  ];

  const chartData = todayRecords.slice(0, 7).map((r: any) => ({
    name: employees?.find(e => e.code === r.employeeCode)?.nameAr || r.employeeCode,
    ساعات: r.totalHours || 0
  }));

  const pieData = [
    { name: 'حضور', value: presentCount },
    { name: 'غياب', value: absentCount },
    { name: 'تأخير', value: lateCount },
    { name: 'إجازات', value: excusedCount },
  ];

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="لوحة التحكم" />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display">ساعات العمل للموظفين (اليوم)</h3>
                <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1" onClick={() => window.location.href = '/attendance'}>
                  عرض التقرير الكامل <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[300px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      cursor={{fill: '#f1f5f9'}}
                    />
                    <Bar dataKey="ساعات" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-sm">
              <h3 className="text-lg font-bold font-display mb-6">توزيع الحالات اليومية</h3>
              <div className="h-[300px] w-full flex items-center justify-center" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-bold mr-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
