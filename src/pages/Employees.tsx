import { useState } from "react";
import { useEmployees, Employee } from "@/hooks/useSupabaseData";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { localDb, defaultUserAccounts } from "@/lib/localStore";
import { employeeSchema } from "@/lib/validation";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Plus, Search, Pencil, Trash2, Loader2, Phone, Building2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logAction } from "@/lib/auditLog";

const emptyEmployee = { name: "", department: "", section: "", position: "", phone: "", work_schedule: "daily" };

const scheduleLabels: Record<string, string> = {
  daily: "يومي",
  shift_7x7: "وجبات 7×7",
  shift_15x15: "وجبات 15×15",
};

const Employees = () => {
  const { data: employees, loading, refetch } = useEmployees();
  const { isManager, isAdmin, isUnitHead, section, userName, isDeptManager, has } = useUserRole();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ employeeId: "", email: "", password: "" });
  const [creatingSaving, setCreatingSaving] = useState(false);

  const filtered = employees.filter((e) =>
    e.name.includes(search) || e.department.includes(search) || e.position.includes(search)
  );

  const openCreate = () => { setEditingEmployee(null); setForm(emptyEmployee); setShowForm(true); };
  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({ name: emp.name, department: emp.department, section: emp.section, position: emp.position, phone: emp.phone, work_schedule: emp.work_schedule || "daily" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { name: form.name, department: form.department, section: form.section, position: form.position, phone: form.phone, work_schedule: form.work_schedule };
    if (editingEmployee) {
      localDb.employees.update(editingEmployee.id, payload);
      await logAction(userName, "تعديل موظف", form.name);
      toast({ title: "تم", description: "تم تحديث بيانات الموظف" });
    } else {
      localDb.employees.insert(payload);
      await logAction(userName, "إضافة موظف", form.name);
      toast({ title: "تم", description: "تم إضافة الموظف" });
    }
    setSaving(false);
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    localDb.employees.delete(id);
    await logAction(userName, "حذف موظف", id);
    toast({ title: "تم", description: "تم حذف الموظف" });
    refetch();
  };

  const handleCreateAccount = async () => {
    const selectedEmp = employees.find(e => e.id === accountForm.employeeId);
    if (!accountForm.employeeId || !selectedEmp) {
      toast({ title: "خطأ", description: "يرجى اختيار موظف من القائمة", variant: "destructive" });
      return;
    }
    if (!accountForm.email || !accountForm.password) {
      toast({ title: "خطأ", description: "البريد وكلمة المرور مطلوبان", variant: "destructive" });
      return;
    }
    if (accountForm.password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setCreatingSaving(true);
    localDb.userAccounts.insert({
      email: accountForm.email,
      password: accountForm.password,
      profile: {
        id: selectedEmp.id,
        name: selectedEmp.name,
        department: selectedEmp.department,
        section: selectedEmp.section,
        position: selectedEmp.position,
        phone: selectedEmp.phone,
        roles: ["individual"],
      },
    });
    localDb.profiles.update(selectedEmp.id, { roles: ["individual"] });
    await logAction(userName, "إنشاء حساب مستخدم", selectedEmp.name);
    toast({ title: "تم", description: `تم إنشاء حساب لـ ${selectedEmp.name}` });
    setShowCreateAccount(false);
    setAccountForm({ employeeId: "", email: "", password: "" });
    setCreatingSaving(false);
  };

  const canManage = has("edit_employee") || has("add_employee");
  const canDelete = has("delete_employee");
  const canCreateAccount = has("create_user_account");
  const canAdd = has("add_employee");

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="إدارة الموظفين" subtitle="إضافة وتعديل وحذف بيانات الموظفين" icon={UserCog} sections={[
        { id: "search_filter", label: "البحث والفلترة" },
        { id: "employees_table", label: "جدول الموظفين" },
      ]} exportData={() => ({
        filename: "employees",
        rows: filtered.map(e => ({ الاسم: e.name, القسم: e.department, الشعبة: e.section, المنصب: e.position, الهاتف: e.phone, النظام: scheduleLabels[e.work_schedule] || e.work_schedule }))
      })} />
      <div className="flex items-center justify-end flex-wrap gap-4 no-print">
        <div className="flex gap-2 flex-wrap">
          {canCreateAccount && <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowCreateAccount(true)}><UserPlus className="w-4 h-4" />إنشاء حساب</Button>}
          {canAdd && <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />موظف جديد</Button>}
        </div>
      </div>

      <div data-print-section="search_filter" className="relative max-w-sm no-print">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو القسم..." className="ps-9" />
      </div>

      <div data-print-section="employees_table" className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>الاسم</th><th>القسم</th><th>الشعبة</th><th>المنصب</th><th>نوع الدوام</th><th>الهاتف</th>{canManage && <th className="no-print">إجراءات</th>}</tr></thead>            <tbody>
              {filtered.length > 0 ? filtered.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-medium text-foreground">{emp.name}</td>
                  <td className="text-muted-foreground">{emp.department}</td>
                  <td className="text-muted-foreground">{emp.section}</td>
                  <td className="text-muted-foreground">{emp.position}</td>
                  <td className="text-muted-foreground">{scheduleLabels[emp.work_schedule] || emp.work_schedule}</td>
                  <td className="text-muted-foreground" dir="ltr">{emp.phone}</td>
                  {canManage && (
                    <td className="no-print">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => openEdit(emp)}><Pencil className="w-3.5 h-3.5" /></Button>
                        {canDelete && <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">لا يوجد موظفون</td></tr>              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length > 0 ? filtered.map((emp) => (
          <div key={emp.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground truncate">{emp.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{emp.position} | {scheduleLabels[emp.work_schedule] || emp.work_schedule}</p>
              </div>
              {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => openEdit(emp)}><Pencil className="w-3.5 h-3.5" /></Button>
                    {canDelete && <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{emp.department} - {emp.section}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{emp.phone}</span></div>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 text-muted-foreground">لا يوجد موظفون</div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingEmployee ? "تعديل الموظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>القسم</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>الشعبة</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المنصب</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
            </div>
            <div>
              <Label>نوع الدوام</Label>
              <Select value={form.work_schedule} onValueChange={(v) => setForm({ ...form, work_schedule: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="shift_7x7">وجبات 7×7</SelectItem>
                  <SelectItem value="shift_15x15">وجبات 15×15</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEmployee ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create Account Dialog */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />إنشاء حساب مستخدم جديد</DialogTitle>
            <DialogDescription>أنشئ حساب تسجيل دخول للموظف ليتمكن من الوصول للنظام</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اختر الموظف</Label>
              <Select value={accountForm.employeeId} onValueChange={(v) => setAccountForm({ ...accountForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر موظفاً من القائمة" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.section || emp.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>البريد الإلكتروني</Label><Input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="email@example.com" dir="ltr" /></div>
            <div><Label>كلمة المرور</Label><Input type="password" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} placeholder="••••••••" dir="ltr" /></div>
            <Button onClick={handleCreateAccount} disabled={creatingSaving} className="w-full">{creatingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
