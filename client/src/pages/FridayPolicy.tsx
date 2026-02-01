import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEmployees } from "@/hooks/use-employees";
import { useFridayPolicyReport, useFridayPolicySettings, useUpdateFridayPolicySettings } from "@/hooks/use-friday-policy";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function FridayPolicy() {
  const { data: employees } = useEmployees();
  const { data: settings } = useFridayPolicySettings();
  const updateSettings = useUpdateFridayPolicySettings();
  const { toast } = useToast();

  const sectors = useMemo(() => {
    return Array.from(new Set(employees?.map(e => e.sector).filter(Boolean) || []));
  }, [employees]);

  const [includedSectors, setIncludedSectors] = useState<string[]>([]);
  const [monthlyMinimumFridaysRequired, setMonthlyMinimumFridaysRequired] = useState(2);
  const [maxCreditPerMonth, setMaxCreditPerMonth] = useState(3);
  const [allowedOffDaysInput, setAllowedOffDaysInput] = useState("1,2,3");
  const [countBiometricAsWorkedFriday, setCountBiometricAsWorkedFriday] = useState(true);
  const [countMissionAsWorkedFriday, setCountMissionAsWorkedFriday] = useState(true);
  const [countPermissionOnlyAsWorkedFriday, setCountPermissionOnlyAsWorkedFriday] = useState(false);
  const [countLeaveAsWorkedFriday, setCountLeaveAsWorkedFriday] = useState(false);
  const [officialHolidayFridayCounts, setOfficialHolidayFridayCounts] = useState(false);
  const [weeklyRestFridayCounts, setWeeklyRestFridayCounts] = useState(false);

  const [reportMonthInput, setReportMonthInput] = useState(format(new Date(), "MM/yyyy"));
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: reportData, isLoading: reportLoading } = useFridayPolicyReport(reportMonth);

  useEffect(() => {
    if (!settings) return;
    setIncludedSectors(Array.isArray(settings.includedSectors) ? settings.includedSectors : []);
    setMonthlyMinimumFridaysRequired(settings.monthlyMinimumFridaysRequired ?? 2);
    setMaxCreditPerMonth(settings.maxCreditPerMonth ?? 3);
    setAllowedOffDaysInput((settings.allowedOffDaysNextMonth || [1, 2, 3]).join(","));
    setCountBiometricAsWorkedFriday(Boolean(settings.countBiometricAsWorkedFriday));
    setCountMissionAsWorkedFriday(Boolean(settings.countMissionAsWorkedFriday));
    setCountPermissionOnlyAsWorkedFriday(Boolean(settings.countPermissionOnlyAsWorkedFriday));
    setCountLeaveAsWorkedFriday(Boolean(settings.countLeaveAsWorkedFriday));
    setOfficialHolidayFridayCounts(Boolean(settings.officialHolidayFridayCounts));
    setWeeklyRestFridayCounts(Boolean(settings.weeklyRestFridayCounts));
  }, [settings]);

  const handleSave = async () => {
    const allowedOffDays = allowedOffDaysInput
      .split(",")
      .map(value => Number(value.trim()))
      .filter(value => Number.isFinite(value) && value >= 1 && value <= 31);

    try {
      await updateSettings.mutateAsync({
        includedSectors,
        monthlyMinimumFridaysRequired,
        maxCreditPerMonth,
        allowedOffDaysNextMonth: allowedOffDays,
        countBiometricAsWorkedFriday,
        countMissionAsWorkedFriday,
        countPermissionOnlyAsWorkedFriday,
        countLeaveAsWorkedFriday,
        officialHolidayFridayCounts,
        weeklyRestFridayCounts,
      });
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الجمعة بنجاح" });
    } catch (err: any) {
      toast({ title: "فشل الحفظ", description: err.message, variant: "destructive" });
    }
  };

  const handleMonthChange = (value: string) => {
    setReportMonthInput(value);
    const match = value.match(/(\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const [, month, year] = match;
      const monthNumber = String(month).padStart(2, "0");
      setReportMonth(`${year}-${monthNumber}`);
    }
  };

  const handleExport = () => {
    if (!reportData?.records || reportData.records.length === 0) return;
    const rows = reportData.records.map((record: any) => ({
      "كود الموظف": record.employeeCode,
      "الاسم": record.employeeName,
      "القطاع": record.sector || "-",
      "الإدارة": record.department || "-",
      "عدد جمعات الشهر السابق": record.eligibleWorkedFridays,
      "رصيد بدل الجمعة": record.creditGranted,
      "مستخدم بدل الجمعة": record.usedDaysCount,
      "متبقي بدل الجمعة": record.remainingCredit,
      "خصم بدل الجمعة": record.totalFridayPolicyDeductionDays,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ملخص بدل الجمعة");
    XLSX.writeFile(workbook, `Friday_Policy_Summary_${reportMonth}.xlsx`);
    toast({ title: "تم التصدير", description: "تم تحميل ملخص بدل الجمعة" });
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="سياسة العمل يوم الجمعة" />

        <main className="flex-1 overflow-y-auto p-8">
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              <TabsTrigger value="report">التقرير</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">القطاعات المشمولة</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {sectors.map((sector) => (
                      <label key={sector as string} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={includedSectors.includes(sector as string)}
                          onCheckedChange={(checked) => {
                            setIncludedSectors(prev =>
                              checked
                                ? [...prev, sector as string]
                                : prev.filter(value => value !== sector)
                            );
                          }}
                        />
                        <span>{sector as string}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">الحد الأدنى لجمعات الشهر</label>
                    <Input
                      type="number"
                      value={monthlyMinimumFridaysRequired}
                      onChange={(e) => setMonthlyMinimumFridaysRequired(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">أقصى رصيد شهري</label>
                    <Input
                      type="number"
                      value={maxCreditPerMonth}
                      onChange={(e) => setMaxCreditPerMonth(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الأيام المسموح بها بالشهر التالي (1-3)</label>
                    <Input
                      type="text"
                      placeholder="1,2,3"
                      value={allowedOffDaysInput}
                      onChange={(e) => setAllowedOffDaysInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-md font-bold">قواعد الاحتساب</h4>
                  <ToggleRow
                    label="احتساب البصمة كجمعة عمل"
                    checked={countBiometricAsWorkedFriday}
                    onChange={setCountBiometricAsWorkedFriday}
                  />
                  <ToggleRow
                    label="احتساب المأمورية كجمعة عمل"
                    checked={countMissionAsWorkedFriday}
                    onChange={setCountMissionAsWorkedFriday}
                  />
                  <ToggleRow
                    label="احتساب الإذن فقط كجمعة عمل"
                    checked={countPermissionOnlyAsWorkedFriday}
                    onChange={setCountPermissionOnlyAsWorkedFriday}
                  />
                  <ToggleRow
                    label="احتساب الإجازات كجمعة عمل"
                    checked={countLeaveAsWorkedFriday}
                    onChange={setCountLeaveAsWorkedFriday}
                  />
                  <ToggleRow
                    label="احتساب الجمعة الرسمية"
                    checked={officialHolidayFridayCounts}
                    onChange={setOfficialHolidayFridayCounts}
                  />
                  <ToggleRow
                    label="احتساب الراحة الأسبوعية يوم الجمعة"
                    checked={weeklyRestFridayCounts}
                    onChange={setWeeklyRestFridayCounts}
                  />
                </div>

                <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-fit">
                  حفظ الإعدادات
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="report">
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <label className="text-sm font-medium">شهر التقرير (MM/YYYY)</label>
                    <Input
                      type="text"
                      value={reportMonthInput}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="mt-1 w-40"
                    />
                  </div>
                  <Button variant="outline" onClick={handleExport}>
                    تصدير ملخص بدل الجمعة
                  </Button>
                </div>

                {reportLoading ? (
                  <div className="text-sm text-muted-foreground">جاري تحميل التقرير...</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-sm text-right min-w-[900px]">
                      <thead className="bg-slate-50 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3">الموظف</th>
                          <th className="px-4 py-3">عدد جمعات الشهر السابق</th>
                          <th className="px-4 py-3">رصيد بدل الجمعة</th>
                          <th className="px-4 py-3">مستخدم بدل الجمعة</th>
                          <th className="px-4 py-3">متبقي بدل الجمعة</th>
                          <th className="px-4 py-3">خصم بدل الجمعة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {reportData?.records?.map((record: any) => (
                          <tr key={record.employeeCode}>
                            <td className="px-4 py-3 font-medium">
                              {record.employeeName} - {record.employeeCode}
                            </td>
                            <td className="px-4 py-3">{record.eligibleWorkedFridays}</td>
                            <td className="px-4 py-3">{record.creditGranted}</td>
                            <td className="px-4 py-3">{record.usedDaysCount}</td>
                            <td className="px-4 py-3">{record.remainingCredit}</td>
                            <td className="px-4 py-3">{record.totalFridayPolicyDeductionDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-md font-bold">تفاصيل المراجعة</h4>
                  <Accordion type="multiple">
                    {reportData?.records?.map((record: any) => (
                      <AccordionItem key={record.employeeCode} value={record.employeeCode}>
                        <AccordionTrigger>
                          {record.employeeName} - {record.employeeCode}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 text-sm">
                            <div>
                              <p className="font-medium mb-2">تفاصيل جمعات الشهر السابق</p>
                              <ul className="list-disc pr-5 space-y-1">
                                {record.fridayDetails?.map((detail: any) => (
                                  <li key={detail.date}>
                                    {detail.date} - {detail.reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium mb-2">تفاصيل الاستخدام بالشهر الحالي</p>
                              <ul className="list-disc pr-5 space-y-1">
                                {record.usageDetails?.length > 0 ? (
                                  record.usageDetails.map((detail: any) => (
                                    <li key={`${detail.date}-${detail.reason}`}>
                                      {detail.date} - {detail.action} ({detail.reason})
                                    </li>
                                  ))
                                ) : (
                                  <li>لا توجد أيام مستخدمة في الفترة المحددة.</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border border-border/50 rounded-lg px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
