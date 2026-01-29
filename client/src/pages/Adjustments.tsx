import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Plus, FileText, CheckCircle2 } from "lucide-react";
import { useAdjustments, useCreateAdjustment } from "@/hooks/use-data";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAdjustmentSchema, LEAVE_TYPES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
              <AddAdjustmentDialog />
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

function AddAdjustmentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createAdjustment = useCreateAdjustment();
  
  const form = useForm({
    resolver: zodResolver(insertAdjustmentSchema),
    defaultValues: {
      employeeCode: "",
      type: "annual",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  const onSubmit = (data: any) => {
    createAdjustment.mutate(data, {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم تسجيل الطلب بنجاح" });
        setOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          طلب جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تسجيل طلب إجازة أو تسوية</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كود الموظف</FormLabel>
                  <FormControl>
                    <Input placeholder="1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الطلب</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">إجازة سنوية</SelectItem>
                      <SelectItem value="sick">إجازة مرضي</SelectItem>
                      <SelectItem value="unpaid">إجازة بدون مرتب</SelectItem>
                      <SelectItem value="mission">مأمورية عمل</SelectItem>
                      <SelectItem value="permission">إذن خروج</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>من تاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>إلى تاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createAdjustment.isPending}>
              {createAdjustment.isPending ? "جاري الحفظ..." : "حفظ الطلب"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
