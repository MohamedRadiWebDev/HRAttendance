import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings2, ShieldCheck } from "lucide-react";
import { useRules, useDeleteRule } from "@/hooks/use-data";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Rules() {
  const { data: rules, isLoading } = useRules();
  const deleteRule = useDeleteRule();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await deleteRule.mutateAsync(id);
      toast({ title: "نجاح", description: "تم حذف القاعدة بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="القواعد والورديات" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-display">إدارة القواعد الخاصة</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة قاعدة جديدة
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse h-48" />
                ))
              ) : rules?.map((rule) => (
                <Card key={rule.id} className="hover-elevate transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold">{rule.name}</CardTitle>
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-primary/5">{rule.ruleType}</Badge>
                        <Badge variant="secondary">أولوية: {rule.priority}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>النطاق: {rule.scope}</p>
                        <p>الفترة: {rule.startDate} إلى {rule.endDate}</p>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <ShieldCheck className="w-4 h-4 text-primary" />
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
