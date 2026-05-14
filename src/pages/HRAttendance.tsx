import DailySituation from "@/components/DailySituation";
import { useHRRequests, useEmployees, type HRRequest } from "@/hooks/useSupabaseData";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { localDb } from "@/lib/localStore";
import { logAction } from "@/lib/auditLog";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Check, X, ChevronLeft, Loader2, Undo2, CalendarPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  pending: "معلّق",
  unit_approved: "موافقة رئيس الشعبة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

const HRAttendance = () => {
  const { data: requests, loading, refetch } = useHRRequests();
  const { data: employees } = useEmployees();
  const { canApproveRequests, canUnitApprove, isManager, isDeptManager, isUnitHead, isAdmin, userName, userId, isIndividual, has } = useUserRole();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employee_name: "", type: "إجازة اعتيادية", date: "", notes: "", department: "" });
  const [leaveSaving, setLeaveSaving] = useState(false);

  const filtered = requests.filter((r) => {
    const matchSearch = r.employee_name.includes(search) || r.type.includes(search);
    const matchStatus = filterStatus === "all" || r.approval_status === filterStatus;
    // Individuals only see their own requests
    const matchOwnership = !isIndividual || r.created_by === userId;
    return matchSearch && matchStatus && matchOwnership;
  });

  // Unit head approves at unit level
  const handleUnitApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    localDb.hrRequests.update(id, {
      approval_status: "unit_approved",
      unit_head_status: "approved",
      unit_head_by: userId,
      unit_head_at: new Date().toISOString(),
    });
    if (req?.created_by) localDb.notifications.insert({ user_id: req.created_by, message: `وافق رئيس الشعبة على طلبك (${req.type})`, type: "info" });
    await logAction(userName, "موافقة رئيس شعبة", `طلب ${id}`);
    toast({ title: "تم", description: "تمت موافقة رئيس الشعبة" });
    refetch();
  };

  const handleUnitReject = async (id: string) => {
    const req = requests.find(r => r.id === id);
    localDb.hrRequests.update(id, {
      approval_status: "rejected",
      unit_head_status: "rejected",
      unit_head_by: userId,
      unit_head_at: new Date().toISOString(),
    });
    if (req?.created_by) localDb.notifications.insert({ user_id: req.created_by, message: `رفض رئيس الشعبة طلبك (${req.type})`, type: "warning" });
    await logAction(userName, "رفض رئيس شعبة", `طلب ${id}`);
    toast({ title: "تم", description: "تم رفض الطلب من قبل رئيس الشعبة" });
    refetch();
  };

  const handleDeptApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    localDb.hrRequests.update(id, {
      approval_status: "approved",
      dept_manager_status: "approved",
      dept_manager_by: userId,
      dept_manager_at: new Date().toISOString(),
    });
    if (req?.created_by) localDb.notifications.insert({ user_id: req.created_by, message: `تمت الموافقة النهائية على طلبك (${req.type})`, type: "info" });
    await logAction(userName, "موافقة نهائية", `طلب ${id}`);
    toast({ title: "تم", description: "تمت الموافقة النهائية" });
    refetch();
  };

  const handleDeptReject = async (id: string) => {
    const req = requests.find(r => r.id === id);
    localDb.hrRequests.update(id, {
      approval_status: "rejected",
      dept_manager_status: "rejected",
      dept_manager_by: userId,
      dept_manager_at: new Date().toISOString(),
    });
    if (req?.created_by) localDb.notifications.insert({ user_id: req.created_by, message: `رفض مدير القسم طلبك (${req.type})`, type: "warning" });
    await logAction(userName, "رفض مدير القسم", `طلب ${id}`);
    toast({ title: "تم", description: "تم رفض الطلب" });
    refetch();
  };

  const handleManagerOverride = async (id: string) => {
    const req = requests.find(r => r.id === id);
    localDb.hrRequests.update(id, {
      approval_status: "approved",
      unit_head_status: "approved",
      unit_head_by: userId,
      unit_head_at: new Date().toISOString(),
      dept_manager_status: "approved",
      dept_manager_by: userId,
      dept_manager_at: new Date().toISOString(),
    });
    if (req?.created_by) localDb.notifications.insert({ user_id: req.created_by, message: `تمت الموافقة على طلبك مباشرة من مدير القسم (${req.type})`, type: "info" });
    await logAction(userName, "موافقة مباشرة (مدير)", `طلب ${id}`);
    toast({ title: "تم", description: "تمت الموافقة النهائية (صلاحية المدير)" });
    refetch();
  };

  const handleUnitUndo = async (id: string) => {
    localDb.hrRequests.update(id, {
      approval_status: "pending",
      unit_head_status: "pending",
      unit_head_by: null,
      unit_head_at: null,
    });
    await logAction(userName, "تراجع رئيس شعبة", `طلب ${id}`);
    toast({ title: "تم", description: "تم التراجع عن قرار رئيس الشعبة" });
    refetch();
  };

  const handleDeptUndo = async (id: string) => {
    localDb.hrRequests.update(id, {
      approval_status: "pending",
      unit_head_status: "pending",
      unit_head_by: null,
      unit_head_at: null,
      dept_manager_status: "pending",
      dept_manager_by: null,
      dept_manager_at: null,
    });
    await logAction(userName, "تراجع مدير القسم", `طلب ${id}`);
    toast({ title: "تم", description: "تم التراجع وإعادة الطلب للمعلّق" });
    refetch();
  };

  const handleCancel = async (id: string) => {
    localDb.hrRequests.update(id, {
      approval_status: "cancelled",
    });
    await logAction(userName, "إلغاء طلب", `طلب ${id}`);
    toast({ title: "تم", description: "تم إلغاء الطلب" });
    refetch();
  };

  const handleSubmitLeave = async () => {
    if (!leaveForm.employee_name || !leaveForm.date) {
      toast({ title: "خطأ", description: "اسم الموظف والتاريخ مطلوبان", variant: "destructive" });
      return;
    }
    setLeaveSaving(true);

    // Duplicate check: prevent "إجازة اعتيادية" on same date for same employee
    if (leaveForm.type === "إجازة اعتيادية") {
      const existing = requests.filter(r =>
        r.employee_name === leaveForm.employee_name &&
        r.type === "إجازة اعتيادية" &&
        r.date === leaveForm.date &&
        ["pending", "unit_approved", "approved"].includes(r.approval_status)
      );
      if (existing.length > 0) {
        toast({ title: "خطأ", description: "يوجد طلب إجازة اعتيادية لنفس الموظف في نفس التاريخ (معلّق أو مقبول)", variant: "destructive" });
        setLeaveSaving(false);
        return;
      }
    }

    // Dept Manager / Admin: skip unit head stage, go directly to dept_manager stage
    const isSubmitterManager = (isDeptManager || isAdmin) && has("manager_override_hr");
    const insertPayload: Record<string, unknown> = {
      employee_name: leaveForm.employee_name,
      type: leaveForm.type,
      date: leaveForm.date,
      notes: leaveForm.notes,
      department: leaveForm.department,
      created_by: userId,
    };
    if (isSubmitterManager) {
      insertPayload.unit_head_status = "approved";
      insertPayload.unit_head_by = userId;
      insertPayload.unit_head_at = new Date().toISOString();
      insertPayload.approval_status = "unit_approved";
    }

    localDb.hrRequests.insert(insertPayload);
    await logAction(userName, "رفع طلب إجازة", leaveForm.employee_name);
    toast({ title: "تم", description: "تم رفع طلب الإجازة بنجاح" });
    setShowLeaveForm(false);
    setLeaveForm({ employee_name: "", type: "إجازة اعتيادية", date: "", notes: "", department: "" });
    refetch();
    setLeaveSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Determine action buttons per role
  const renderActions = (req: HRRequest) => {
    const btns: React.ReactNode[] = [];

    // INDIVIDUAL: can cancel their own pending/unit_approved request
    if (isIndividual && req.created_by === userId && (req.approval_status === "pending" || req.approval_status === "unit_approved") && has("cancel_own_request")) {
      btns.push(
        <button key="cancel" onClick={() => handleCancel(req.id)} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20" title="إلغاء الطلب"><X className="w-3.5 h-3.5" /></button>
      );
    }

    // UNIT HEAD (not manager): sees only unit-level buttons
    // IMPORTANT: unit head cannot be the requester
    const isRequester = req.created_by === userId;
    if (isUnitHead && !isManager && !isAdmin && !isRequester && has("approve_hr_unit")) {
      const managerVetoed = req.dept_manager_status === "rejected";
      if (!managerVetoed && req.approval_status === "pending") {
        btns.push(
          <button key="ua" onClick={() => handleUnitApprove(req.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="موافقة رئيس الشعبة"><Check className="w-3.5 h-3.5" /></button>,
          <button key="ur" onClick={() => handleUnitReject(req.id)} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20" title="رفض"><X className="w-3.5 h-3.5" /></button>
        );
      }
      if (!managerVetoed && req.unit_head_status === "approved" && req.dept_manager_status === "pending") {
        btns.push(
          <button key="uu" onClick={() => handleUnitUndo(req.id)} className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20" title="تراجع"><Undo2 className="w-3.5 h-3.5" /></button>
        );
      }
    }

    // DEPT MANAGER / ADMIN: sees dept-level buttons (NOT on own requests)
    if ((isDeptManager || isAdmin) && !isRequester && has("approve_hr_dept")) {
      if (req.approval_status === "pending") {
        btns.push(
          <button key="mo" onClick={() => handleManagerOverride(req.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="موافقة مباشرة"><Check className="w-3.5 h-3.5" strokeWidth={3} /></button>,
          <button key="mr" onClick={() => handleDeptReject(req.id)} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20" title="رفض"><X className="w-3.5 h-3.5" /></button>
        );
      }
      // Approve after unit head approval
      if (req.approval_status === "unit_approved") {
        btns.push(
          <button key="da" onClick={() => handleDeptApprove(req.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="موافقة نهائية"><Check className="w-3.5 h-3.5" /></button>,
          <button key="dr" onClick={() => handleDeptReject(req.id)} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20" title="رفض"><X className="w-3.5 h-3.5" /></button>
        );
      }
      // Manager Override: can overrule unit head rejection
      if (req.approval_status === "rejected" && req.unit_head_status === "rejected" && req.dept_manager_status === "pending") {
        btns.push(
          <button key="override" onClick={() => handleManagerOverride(req.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="تجاوز رفض رئيس الشعبة"><Check className="w-3.5 h-3.5" strokeWidth={3} /></button>
        );
      }
      // Undo for finalized requests
      if (req.approval_status === "approved" || (req.approval_status === "rejected" && req.dept_manager_status === "rejected")) {
        if (has("undo_hr_decision")) {
          btns.push(
            <button key="du" onClick={() => handleDeptUndo(req.id)} className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20" title="تراجع"><Undo2 className="w-3.5 h-3.5" /></button>
          );
        }
      }
    }

    btns.push(
      <button key="det" onClick={() => setSelectedRequest(req)} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20" title="التفاصيل"><ChevronLeft className="w-3.5 h-3.5" /></button>
    );

    return <div className="flex gap-1">{btns}</div>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="الموارد البشرية" subtitle="سجل الطلبات والموقف اليومي" icon={Users} sections={[
        { id: "daily_situation", label: "الموقف اليومي" },
        { id: "requests_table", label: "سجل الطلبات" },
      ]} exportData={() => ({
        filename: "hr-requests",
        rows: filtered.map(r => ({ الاسم: r.employee_name, القسم: r.department, النوع: r.type, التاريخ: r.date, الحالة: statusLabels[r.approval_status] || r.approval_status, ملاحظات: r.notes || "" }))
      })} />
      <div data-print-section="daily_situation"><DailySituation /></div>
      <div className="border-t border-border no-print" />

      <div className="flex items-center justify-end flex-wrap gap-4 no-print">
        <Button size="sm" className="gap-2" onClick={() => {
          setLeaveForm({ employee_name: isIndividual ? userName : "", type: "إجازة اعتيادية", date: new Date().toISOString().split("T")[0], notes: "", department: "" });
          setShowLeaveForm(true);
        }}>
          <CalendarPlus className="w-4 h-4" />رفع طلب إجازة
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-center no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو النوع..." className="ps-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "unit_approved", "approved", "rejected", "cancelled"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s === "all" ? "الكل" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div data-print-section="requests_table" className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>الموظف</th><th>القسم</th><th>النوع</th><th>التاريخ</th><th>رئيس الشعبة</th><th>رئيس القسم</th><th>الحالة</th><th className="no-print">إجراءات</th></tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((req) => (
                <tr key={req.id}>
                  <td className="font-medium text-foreground">{req.employee_name}</td>
                  <td>{req.department}</td>
                  <td><StatusBadge status={req.type} variant="info" /></td>
                  <td className="text-muted-foreground">{req.date}</td>
                  <td>
                    <StatusBadge
                      status={req.unit_head_status === "approved" ? "موافق" : req.unit_head_status === "rejected" ? "مرفوض" : "معلّق"}
                      variant={req.unit_head_status === "approved" ? "success" : req.unit_head_status === "rejected" ? "danger" : "neutral"}
                    />
                  </td>
                  <td>
                    <StatusBadge
                      status={req.dept_manager_status === "approved" ? "موافق" : req.dept_manager_status === "rejected" ? "مرفوض" : "معلّق"}
                      variant={req.dept_manager_status === "approved" ? "success" : req.dept_manager_status === "rejected" ? "danger" : "neutral"}
                    />
                  </td>
                  <td><StatusBadge status={statusLabels[req.approval_status] || req.approval_status} /></td>
                  <td className="no-print">{renderActions(req)}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد طلبات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">الموظف</p><p className="font-medium text-foreground">{selectedRequest.employee_name}</p></div>
                <div><p className="text-muted-foreground">القسم</p><p className="font-medium text-foreground">{selectedRequest.department}</p></div>
                <div><p className="text-muted-foreground">النوع</p><p className="font-medium text-foreground">{selectedRequest.type}</p></div>
                <div><p className="text-muted-foreground">التاريخ</p><p className="font-medium text-foreground">{selectedRequest.date}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">ملاحظات</p><p className="text-foreground">{selectedRequest.notes}</p></div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">مسار الموافقة</p>
                <div className="space-y-3">
                  {[
                    { label: "تقديم الطلب", done: true },
                    { label: "مراجعة رئيس الشعبة", done: selectedRequest.unit_head_status === "approved", rejected: selectedRequest.unit_head_status === "rejected", date: selectedRequest.unit_head_at },
                    { label: "موافقة رئيس القسم", done: selectedRequest.dept_manager_status === "approved", rejected: selectedRequest.dept_manager_status === "rejected", date: selectedRequest.dept_manager_at },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.done ? "bg-success text-success-foreground" : step.rejected ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                        {step.done ? "✓" : step.rejected ? "✕" : i + 1}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</span>
                        {step.date && <p className="text-[10px] text-muted-foreground">{new Date(step.date).toLocaleString("ar-SA")}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveForm} onOpenChange={setShowLeaveForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-primary" />رفع طلب إجازة</DialogTitle>
            <DialogDescription>سيتم إرسال الطلب لمسؤول الشعبة ورئيس القسم للموافقة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الموظف</Label>
              {isIndividual ? (
                <Input value={leaveForm.employee_name} disabled />
              ) : (
                <Select value={leaveForm.employee_name} onValueChange={(v) => {
                  const emp = employees.find(e => e.name === v);
                  setLeaveForm({ ...leaveForm, employee_name: v, department: emp?.department || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>نوع الطلب</Label>
              <Select value={leaveForm.type} onValueChange={(v) => setLeaveForm({ ...leaveForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="إجازة اعتيادية">إجازة اعتيادية</SelectItem>
                  <SelectItem value="إجازة مرضية">إجازة مرضية</SelectItem>
                  <SelectItem value="إجازة طارئة">إجازة طارئة</SelectItem>
                  <SelectItem value="خروجية">خروجية</SelectItem>
                  <SelectItem value="غياب">غياب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })} />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} placeholder="سبب الطلب أو ملاحظات إضافية" />
            </div>
            <Button onClick={handleSubmitLeave} disabled={leaveSaving} className="w-full">
              {leaveSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRAttendance;
