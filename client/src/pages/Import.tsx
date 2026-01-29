import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Upload, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { useImportEmployees, useImportPunches } from "@/hooks/use-employees";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Import() {
  const { toast } = useToast();
  const importEmployees = useImportEmployees();
  const importPunches = useImportPunches();
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("employees");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        console.log("Excel Preview Data:", data[0]); // Debug first row
        
        if (data.length === 0) {
          toast({ title: "تنبيه", description: "الملف فارغ", variant: "destructive" });
          return;
        }
        
        setPreviewData(data);
        toast({ title: "تم قراءة الملف", description: `تم العثور على ${data.length} سجل` });
      } catch (err: any) {
        toast({ title: "خطأ في قراءة الملف", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setIsProcessing(true);
    
    try {
      if (activeTab === "employees") {
        const mapped = previewData.map((row: any) => ({
          code: String(row['الكود'] || row['Code'] || row['ID'] || row['id'] || ""),
          nameAr: String(row['الاسم'] || row['Name'] || row['name'] || ""),
          department: String(row['القسم'] || row['Department'] || row['dept'] || ""),
          shiftStart: String(row['بداية الوردية'] || row['ShiftStart'] || row['shift'] || "09:00"),
        })).filter(emp => emp.code && emp.nameAr);

        if (mapped.length === 0) throw new Error("لم يتم العثور على بيانات موظفين صالحة. تأكد من وجود أعمدة (ID, Name)");
        await importEmployees.mutateAsync(mapped);
      } else {
        const mapped = previewData.map((row: any) => {
          // Try to find employee code
          const employeeCode = String(row['كود'] || row['ID'] || row['Code'] || row['الكود'] || row['id'] || row['Employee ID'] || "");
          
          // Try to find date/time
          const rawDate = row['التاريخ_والوقت'] || row['Punch Datetime'] || row['Clock In'] || row['Date'] || row['Time'] || row['date'] || row['time'] || row['التاريخ'] || row['الوقت'];
          
          let punchDatetime: Date;
          if (rawDate instanceof Date) {
            punchDatetime = rawDate;
          } else {
            punchDatetime = new Date(rawDate);
          }
          
          return {
            employeeCode,
            punchDatetime,
          };
        }).filter(p => p.employeeCode && !isNaN(p.punchDatetime.getTime()));

        if (mapped.length === 0) throw new Error("لم يتم العثور على سجلات بصمة صالحة. تأكد من وجود أعمدة (ID, Clock In)");
        await importPunches.mutateAsync(mapped);
      }
      
      toast({ title: "نجاح", description: "تم استيراد البيانات بنجاح" });
      setPreviewData([]);
    } catch (err: any) {
      toast({ title: "فشل الاستيراد", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="استيراد البيانات" />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-8 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-display mb-2">رفع ملف إكسل</h3>
              <p className="text-muted-foreground mb-8">قم بسحب وإفلات الملف هنا، أو انقر للاختيار من جهازك</p>
              
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPreviewData([]); }} className="w-full max-w-md mx-auto mb-8">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="employees">بيانات الموظفين</TabsTrigger>
                  <TabsTrigger value="punches">سجلات البصمة</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex justify-center">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary/10 file:text-primary
                    hover:file:bg-primary/20 cursor-pointer max-w-sm mx-auto
                  "
                />
              </div>
            </div>

            {previewData.length > 0 && (
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileType className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold">معاينة البيانات ({previewData.length} سجل)</span>
                  </div>
                  <Button onClick={handleImport} disabled={isProcessing} className="gap-2">
                    {isProcessing ? "جاري الاستيراد..." : "تأكيد الاستيراد"}
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-6 py-3 font-medium text-slate-600">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-3 text-slate-600">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <div className="p-4 text-center text-muted-foreground bg-slate-50 border-t border-border/50">
                      ... والمزيد ({previewData.length - 10} سجل)
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-800 mb-1">تعليمات الاستيراد</h4>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>تأكد من مطابقة أسماء الأعمدة (ID, Name, Date, Clock In, Clock Out)</li>
                  <li>صيغة التاريخ والوقت يجب أن تكون واضحة للنظام</li>
                  <li>الملفات المدعومة هي .xlsx و .xls فقط</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
