import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Plus, Trash2, Download } from "lucide-react";
import { useTemplates, useDeleteTemplate } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";

export default function Templates() {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: "نجاح", description: "تم حذف النموذج بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="نماذج الإكسل" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-display">إدارة القوالب والنماذج</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إنشاء نموذج جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse h-48" />
                ))
              ) : templates?.map((template) => (
                <Card key={template.id} className="hover-elevate transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold">{template.name}</CardTitle>
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>النوع: {template.type === 'attendance' ? 'حضور وانصراف' : 'ملخص شهري'}</p>
                        <p>الأعمدة المعرفة: {Object.keys(template.mapping as any).length}</p>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
