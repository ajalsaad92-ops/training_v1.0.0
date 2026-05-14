import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks, useTaskHandovers, useEmployees, useTaskComments } from "@/hooks/useSupabaseData";
import { useUserRole } from "@/hooks/useUserRole";
import { localDb } from "@/lib/localStore";
import { logAction } from "@/lib/auditLog";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ListTodo, Plus, Loader2, ArrowLeftRight, Eye, Clock, Check, MessageSquare, Send } from "lucide-react";

const stageLabels: Record<string, string> = {
  writing: "الكتابة",
  new_form: "النموذج الجديد",
  auditing: "التدقيق",
  printing: "الطباعة",
  pdf: "PDF",
  new_ppt: "عرض تقديمي جديد",
  routine: "مهمة اعتيادية",
};

const statusLabels: Record<string, string> = {
  pending: "معلّق",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  review: "بانتظار المراجعة",
  handed_over: "تم التسليم",
  approved: "معتمد",
};

const curriculumStages = ["writing", "new_form", "auditing", "printing"];
const presentationStages = ["pdf", "new_ppt"];

const Tasks = () => {
  const { data: tasks, loading, refetch } = useTasks();
  const { data: employees } = useEmployees();
  const { persona, isManager, isAdmin, isUnitHead, isIndividual, section, userId, userName, canEditTasks, has } = useUserRole();

  const ename = (id: string | null) => id ? (employees.find(e => e.id === id)?.name || id) : "—";
  const [showCreate, setShowCreate] = useState(false);
  const [showHandover, setShowHandover] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", unit: "", stage: "writing", assigned_to: "", estimated_hours: 0, is_routine: false });
  const [handoverForm, setHandoverForm] = useState({ to_user: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [filterUnit, setFilterUnit] = useState("all");
  const [commentText, setCommentText] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && tasks.some(t => t.id === focusId)) {
      setShowDetail(focusId);
      searchParams.delete("focus");
      setSearchParams(searchParams, { replace: true });
    }
  }, [tasks, searchParams, setSearchParams]);
  const [threadText, setThreadText] = useState("");
  const [threadRecipient, setThreadRecipient] = useState("");
  const { data: taskComments, refetch: refetchComments } = useTaskComments(showDetail || undefined);

  // Individual: only see tasks in their section
  const visibleTasks = tasks.filter(t => {
    if (isManager || isAdmin) return true;
    if (isIndividual) return t.unit === section || t.assigned_to === userId;
    // Unit head sees their section tasks
    if (filterUnit !== "all") return t.unit === filterUnit;
    return true;
  });

  const taskUnits = [...new Set(visibleTasks.map(t => t.unit).filter(Boolean))];

  const myTasks = visibleTasks.filter(t => t.assigned_to === userId);
  const otherTasks = visibleTasks.filter(t => t.assigned_to !== userId);

  const canEditTask = (task: typeof tasks[0]) => {
    if (isManager || isAdmin) return true;
    if (task.assigned_to === userId && task.status !== "handed_over") return has("edit_task");
    if (task.unit === section && canEditTasks) return true;
    return false;
  };

  const handleCreate = async () => {
    if (!form.title) {
      toast({ title: "خطأ", description: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      unit: (isManager || isAdmin) ? form.unit : section,
      stage: form.is_routine ? "routine" : form.stage,
      status: "pending",
      assigned_to: form.assigned_to || null,
      assigned_by: userId,
      created_by: userId,
      estimated_hours: form.estimated_hours,
      is_routine: form.is_routine,
    };
    localDb.tasks.insert(payload);
    await logAction(userName, "إنشاء مهمة", form.title);
    toast({ title: "تم", description: "تم إنشاء المهمة" });
    if (form.assigned_to) {
      localDb.notifications.insert({ user_id: form.assigned_to, message: `مهمة جديدة: ${form.title}`, type: "info", link: "/tasks" });
    }
    setSaving(false);
    setShowCreate(false);
    setForm({ title: "", description: "", unit: "", stage: "writing", assigned_to: "", estimated_hours: 0, is_routine: false });
    refetch();
  };

  const handleHandover = async (taskId: string) => {
    if (!handoverForm.to_user) {
      toast({ title: "خطأ", description: "اختر المستلم", variant: "destructive" });
      return;
    }
    setSaving(true);
    const task = tasks.find(t => t.id === taskId);
    const toEmp = employees.find(e => e.id === handoverForm.to_user);

    localDb.tasks.update(taskId, {
      assigned_to: handoverForm.to_user,
      previous_owner: userId,
      handed_over: true,
      handed_over_at: new Date().toISOString(),
      status: "handed_over",
    });

    localDb.taskHandovers.insert({
      task_id: taskId,
      from_user_id: userId,
      from_user_name: userName,
      to_user_id: handoverForm.to_user,
      to_user_name: toEmp?.name || "",
      stage: task?.stage || "",
      notes: handoverForm.notes,
    });

    await logAction(userName, "تسليم مهمة", `${task?.title} → ${toEmp?.name}`);
    toast({ title: "تم", description: "تم تسليم المهمة بنجاح" });
    localDb.notifications.insert({ user_id: handoverForm.to_user, message: `تم تسليم مهمة إليك: ${task?.title || ""}`, type: "info", link: `/tasks?focus=${taskId}` });
    setSaving(false);
    setShowHandover(null);
    setHandoverForm({ to_user: "", notes: "" });
    refetch();
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    localDb.tasks.update(taskId, { status: newStatus });
    const task = tasks.find(t => t.id === taskId);
    await logAction(userName, "تحديث حالة مهمة", `${task?.title} → ${statusLabels[newStatus]}`);
    toast({ title: "تم", description: "تم تحديث الحالة" });
    refetch();
  };

  // Individual marks task as completed -> goes to "review" for unit head
  const handleMarkCompleted = async (taskId: string) => {
    localDb.tasks.update(taskId, { status: "review" });
    const task = tasks.find(t => t.id === taskId);
    await logAction(userName, "إنهاء مهمة (بانتظار المراجعة)", task?.title || "");
    toast({ title: "تم", description: "تم تحديد المهمة كمكتملة وهي الآن بانتظار مراجعة رئيس الشعبة" });
    localDb.notifications.insert({ user_id: null, message: `مهمة مكتملة بانتظار المراجعة: ${task?.title || ""}`, type: "info", link: `/tasks?focus=${taskId}` });
    refetch();
  };

  // Unit head approves a completed task -> adds achievement points
  const handleApproveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    localDb.tasks.update(taskId, {
      status: "approved",
      achievement_points: (task?.achievement_points || 0) + 1,
    });
    await logAction(userName, "اعتماد مهمة", task?.title || "");
    toast({ title: "تم", description: "تم اعتماد المهمة وإضافة نقاط الإنجاز" });
    if (task?.assigned_to) {
      localDb.notifications.insert({ user_id: task.assigned_to, message: `تم اعتماد مهمتك: ${task.title} (+1 نقطة)`, type: "info", link: `/tasks?focus=${taskId}` });
    }
    refetch();
  };

  // Unit head sends comment -> reverts to in_progress
  const handleSendComment = async (taskId: string) => {
    if (!commentText.trim()) {
      toast({ title: "خطأ", description: "اكتب ملاحظة أولاً", variant: "destructive" });
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    localDb.tasks.update(taskId, {
      status: "in_progress",
      description: `${task?.description || ""}\n\n📝 ملاحظة رئيس الشعبة: ${commentText}`,
    });
    await logAction(userName, "إرجاع مهمة مع ملاحظة", task?.title || "");
    toast({ title: "تم", description: "تم إرجاع المهمة مع الملاحظة" });
    if (task?.assigned_to) {
      localDb.notifications.insert({ user_id: task.assigned_to, message: `ملاحظة على مهمة: ${task.title}`, type: "warning", link: `/tasks?focus=${taskId}` });
    }
    setCommentText("");
    refetch();
  };

  // Post a thread comment on a task
  const handlePostComment = async (taskId: string) => {
    if (!threadText.trim()) {
      toast({ title: "خطأ", description: "اكتب التعليق أولاً", variant: "destructive" });
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    const recipientId = threadRecipient || (task?.assigned_to === userId ? task?.assigned_by : task?.assigned_to) || null;
    const recipient = employees.find(e => e.id === recipientId);
    localDb.taskComments.insert({
      task_id: taskId,
      author_id: userId,
      author_name: userName,
      recipient_id: recipientId,
      recipient_name: recipient?.name || "",
      message: threadText.trim(),
    });
    if (recipientId) {
      localDb.notifications.insert({
        user_id: recipientId,
        message: `تعليق جديد من ${userName} على مهمة: ${task?.title || ""}`,
        type: "info",
        link: `/tasks?focus=${taskId}`,
      });
    }
    await logAction(userName, "تعليق على مهمة", task?.title || "");
    setThreadText("");
    setThreadRecipient("");
    refetchComments();
    toast({ title: "تم", description: "تم إرسال التعليق" });
  };

  const handleAdvanceStage = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.is_routine) return;
    const allStages = [...curriculumStages, ...presentationStages];
    const currentIdx = allStages.indexOf(task.stage);
    if (currentIdx < allStages.length - 1) {
      const nextStage = allStages[currentIdx + 1];
      localDb.tasks.update(taskId, { stage: nextStage });
      await logAction(userName, "ترقية مرحلة مهمة", `${task.title}: ${stageLabels[task.stage]} → ${stageLabels[nextStage]}`);
      toast({ title: "تم", description: `تم الانتقال إلى مرحلة: ${stageLabels[nextStage]}` });
      refetch();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const selectedTask = tasks.find(t => t.id === showDetail);

  const renderTaskActions = (task: typeof tasks[0], isMyTask: boolean) => {
    const btns: React.ReactNode[] = [];

    // Individual: can start, mark completed (goes to review)
    if (isMyTask && isIndividual) {
      if (task.status === "pending" || task.status === "in_progress") {
        if (task.status === "pending") {
          btns.push(<button key="start" onClick={() => handleUpdateStatus(task.id, "in_progress")} className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 text-xs">بدء</button>);
        }
        btns.push(<button key="done" onClick={() => handleMarkCompleted(task.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 text-xs">إنهاء</button>);
      }
    }

    // Unit head: can approve or comment on "review" tasks
    if ((isUnitHead || isManager || isAdmin) && task.status === "review") {
      btns.push(
        <button key="approve" onClick={() => handleApproveTask(task.id)} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 text-xs flex items-center gap-1"><Check className="w-3 h-3" />اعتماد</button>,
        <button key="comment" onClick={() => setShowDetail(task.id)} className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 text-xs flex items-center gap-1"><MessageSquare className="w-3 h-3" />ملاحظة</button>
      );
    }

    // Manager/unit head: standard actions for non-review tasks
    if ((isManager || isAdmin || (isUnitHead && !isIndividual)) && !isMyTask) {
      if (task.status !== "approved" && task.status !== "handed_over" && task.status !== "review") {
        btns.push(
          <button key="complete" onClick={() => handleUpdateStatus(task.id, "completed")} className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 text-xs">إنهاء</button>
        );
      }
    }

    // Handover for non-completed
    if (canEditTask(task) && !["completed", "handed_over", "approved", "review"].includes(task.status)) {
      if (!task.is_routine) btns.push(<button key="advance" onClick={() => handleAdvanceStage(task.id)} className="p-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 text-xs">ترقية</button>);
      btns.push(<button key="handover" onClick={() => setShowHandover(task.id)} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20" title="تسليم"><ArrowLeftRight className="w-3.5 h-3.5" /></button>);
    }

    btns.push(<button key="view" onClick={() => setShowDetail(task.id)} className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"><Eye className="w-3.5 h-3.5" /></button>);
    return <div className="flex gap-1">{btns}</div>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="إدارة المهام" subtitle="إنشاء المهام وتتبع التسليم والمراحل" icon={ListTodo} sections={[
        { id: "search_filter", label: "البحث والفلترة" },
        { id: "tasks_list", label: "قائمة المهام" },
      ]} exportData={() => ({
        filename: "tasks",
        rows: visibleTasks.map(t => ({ العنوان: t.title, الوحدة: t.unit, المرحلة: stageLabels[t.stage] || t.stage, الحالة: statusLabels[t.status] || t.status, المسند_إلى: ename(t.assigned_to), الأولوية: t.achievement_points || 0, روتيني: t.is_routine ? "نعم" : "لا" }))
      })} />
      <div className="flex items-center justify-end flex-wrap gap-4 no-print">
        {canEditTasks && (
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />مهمة جديدة</Button>
        )}
      </div>

      {!isIndividual && (
        <div className="flex gap-2 flex-wrap no-print">
          <button onClick={() => setFilterUnit("all")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterUnit === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>الكل</button>
          {taskUnits.filter(Boolean).map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterUnit === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{u}</button>
          ))}
        </div>
      )}

      <div data-print-section="tasks_list" className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{visibleTasks.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي المهام</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{visibleTasks.filter(t => t.status === "completed" || t.status === "approved").length}</p>
          <p className="text-xs text-muted-foreground">مكتملة / معتمدة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{visibleTasks.filter(t => t.status === "in_progress").length}</p>
          <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{visibleTasks.filter(t => t.status === "review").length}</p>
          <p className="text-xs text-muted-foreground">بانتظار المراجعة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{visibleTasks.filter(t => t.is_routine).length}</p>
          <p className="text-xs text-muted-foreground">اعتيادية</p>
        </div>
      </div>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">مهامي</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>العنوان</th><th>الموكل إليه</th><th>الوحدة</th><th>المرحلة</th><th>الوقت</th><th>الحالة</th><th className="no-print">إجراءات</th></tr></thead>
                <tbody>
                  {myTasks.map(task => (
                    <tr key={task.id}>
                      <td className="font-medium text-foreground">{task.title}{task.is_routine && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-1">اعتيادية</span>}</td>
                      <td className="text-foreground text-sm">{ename(task.assigned_to)}</td>
                      <td className="text-muted-foreground">{task.unit}</td>
                      <td><StatusBadge status={stageLabels[task.stage] || task.stage} variant="info" /></td>
                      <td className="text-center text-muted-foreground">{task.estimated_hours ? `${task.estimated_hours} س` : "-"}</td>
                      <td><StatusBadge status={statusLabels[task.status] || task.status} variant={task.status === "review" ? "warning" : task.status === "approved" ? "success" : undefined} /></td>
                      <td className="no-print">{renderTaskActions(task, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other Tasks */}
      {!isIndividual && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">{myTasks.length > 0 ? "مهام أخرى" : "جميع المهام"}</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>العنوان</th><th>الموكل إليه</th><th>الوحدة</th><th>المرحلة</th><th>الوقت</th><th>الحالة</th><th className="no-print">إجراءات</th></tr></thead>
                <tbody>
                  {(myTasks.length > 0 ? otherTasks : visibleTasks).length > 0 ?
                    (myTasks.length > 0 ? otherTasks : visibleTasks).map(task => (
                      <tr key={task.id}>
                        <td className="font-medium text-foreground">{task.title}{task.is_routine && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-1">اعتيادية</span>}</td>
                        <td className="text-foreground text-sm">{ename(task.assigned_to)}</td>
                        <td className="text-muted-foreground">{task.unit}</td>
                        <td><StatusBadge status={stageLabels[task.stage] || task.stage} variant="info" /></td>
                        <td className="text-center text-muted-foreground">{task.estimated_hours ? `${task.estimated_hours} س` : "-"}</td>
                        <td><StatusBadge status={statusLabels[task.status] || task.status} variant={task.status === "review" ? "warning" : task.status === "approved" ? "success" : undefined} /></td>
                        <td className="no-print">{renderTaskActions(task, false)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد مهام</td></tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مهمة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_routine} onCheckedChange={(c) => setForm({ ...form, is_routine: !!c })} id="is_routine" />
              <Label htmlFor="is_routine">مهمة اعتيادية (لا تمر بمراحل المناهج/العروض)</Label>
            </div>

            {(isManager || isAdmin) && (
              <div>
                <Label>الوحدة</Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الوحدة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الإعداد">وحدة الإعداد</SelectItem>
                    <SelectItem value="المناهج">وحدة المناهج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!form.is_routine && (
              <div>
                <Label>المرحلة</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).filter(([k]) => k !== "routine").map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />الوقت المقدر (ساعات)</Label>
              <Input type="number" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: Number(e.target.value) })} />
            </div>

            <div>
              <Label>تعيين إلى</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => (isManager || isAdmin) || e.section === section)
                    .map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={!!showHandover} onOpenChange={() => setShowHandover(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تسليم المهمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {showHandover && (
              <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">المعيّن حالياً: </span>
                <span className="font-bold text-foreground">{ename(tasks.find(t => t.id === showHandover)?.assigned_to || null)}</span>
              </div>
            )}
            <div>
              <Label>تسليم إلى</Label>
              <Select value={handoverForm.to_user} onValueChange={v => setHandoverForm({ ...handoverForm, to_user: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المستلم" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={handoverForm.notes} onChange={e => setHandoverForm({ ...handoverForm, notes: e.target.value })} rows={2} /></div>
            <Button onClick={() => showHandover && handleHandover(showHandover)} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسليم"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with comment feature */}
      <Dialog open={!!showDetail} onOpenChange={() => { setShowDetail(null); setCommentText(""); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل المهمة</DialogTitle></DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2"><p className="text-muted-foreground">العنوان</p><p className="font-medium text-foreground text-base">{selectedTask.title}</p></div>
                <div><p className="text-muted-foreground">الموكل إليه</p><p className="font-semibold text-primary">{ename(selectedTask.assigned_to)}</p></div>
                <div><p className="text-muted-foreground">الوحدة</p><p className="font-medium text-foreground">{selectedTask.unit}</p></div>
                <div><p className="text-muted-foreground">أنشأها</p><p className="text-foreground">{ename(selectedTask.created_by)}</p></div>
                <div><p className="text-muted-foreground">أسندها</p><p className="text-foreground">{ename(selectedTask.assigned_by)}</p></div>
                <div><p className="text-muted-foreground">المرحلة</p><StatusBadge status={stageLabels[selectedTask.stage] || selectedTask.stage} variant="info" /></div>
                <div><p className="text-muted-foreground">الحالة</p><StatusBadge status={statusLabels[selectedTask.status] || selectedTask.status} variant={selectedTask.status === "approved" ? "success" : selectedTask.status === "review" ? "warning" : undefined} /></div>
                <div><p className="text-muted-foreground">نقاط الإنجاز</p><p className="font-bold text-primary">{selectedTask.achievement_points}</p></div>
                <div><p className="text-muted-foreground">الوقت المقدر</p><p className="text-foreground">{selectedTask.estimated_hours ? `${selectedTask.estimated_hours} ساعة` : "-"}</p></div>
                <div><p className="text-muted-foreground">تم التسليم</p><p className="text-foreground">{selectedTask.handed_over ? "نعم" : "لا"}</p></div>
                {selectedTask.previous_owner && <div><p className="text-muted-foreground">المالك السابق</p><p className="text-warning">{ename(selectedTask.previous_owner)}</p></div>}
                <div><p className="text-muted-foreground">نوع المهمة</p><p className="text-foreground">{selectedTask.is_routine ? "اعتيادية" : "مراحل"}</p></div>
                {selectedTask.description && <div className="col-span-2"><p className="text-muted-foreground">الوصف</p><p className="text-foreground whitespace-pre-wrap">{selectedTask.description}</p></div>}
              </div>

              {/* Unit head comment/approve section for review tasks */}
              {(isUnitHead || isManager || isAdmin) && selectedTask.status === "review" && (
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-4 h-4 text-warning" />مراجعة المهمة</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="gap-1" onClick={() => handleApproveTask(selectedTask.id)}>
                      <Check className="w-3.5 h-3.5" />اعتماد
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظة / تعليق (يرجع المهمة للتنفيذ)</Label>
                    <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="أضف ملاحظة للموظف..." rows={2} />
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSendComment(selectedTask.id)} disabled={!commentText.trim()}>
                      <Send className="w-3.5 h-3.5" />إرسال الملاحظة
                    </Button>
                  </div>
                </div>
              )}

              {!selectedTask.is_routine && (
                <div className="border-t border-border pt-3">
                  <p className="text-sm font-bold text-foreground mb-2">مسار المهمة</p>
                  <div className="flex gap-1 flex-wrap">
                    {[...curriculumStages, ...presentationStages].map((s, i) => {
                      const isCurrent = selectedTask.stage === s;
                      const isPast = [...curriculumStages, ...presentationStages].indexOf(selectedTask.stage) > i;
                      return (
                        <div key={s} className={`px-2 py-1 rounded text-xs ${isCurrent ? "bg-primary text-primary-foreground font-bold" : isPast ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                          {stageLabels[s]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments thread — visible only to author/recipient/managers */}
              {(() => {
                const canSeeThread =
                  isManager || isAdmin || isUnitHead ||
                  selectedTask.assigned_to === userId ||
                  selectedTask.assigned_by === userId ||
                  selectedTask.created_by === userId;
                if (!canSeeThread) return null;
                const visibleComments = taskComments.filter((c: { author_id?: string; recipient_id?: string }) =>
                  isManager || isAdmin || isUnitHead ||
                  c.author_id === userId || c.recipient_id === userId
                );
                const canPost = selectedTask.assigned_to === userId || selectedTask.assigned_by === userId || isManager || isAdmin || isUnitHead;
                return (
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />التعليقات ({visibleComments.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {visibleComments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">لا توجد تعليقات بعد</p>
                      ) : visibleComments.map((c: { id: string; author_id: string; author_name: string; recipient_name?: string; message: string; created_at: string }) => {
                        const mine = c.author_id === userId;
                        return (
                          <div key={c.id} className={`rounded-lg p-2.5 text-sm ${mine ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-border"}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">{c.author_name}{c.recipient_name ? ` ← ${c.recipient_name}` : ""}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">{c.message}</p>
                          </div>
                        );
                      })}
                    </div>
                    {canPost && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Select value={threadRecipient} onValueChange={setThreadRecipient}>
                            <SelectTrigger className="text-xs"><SelectValue placeholder="موجّه إلى (اختياري)" /></SelectTrigger>
                            <SelectContent>
                              {employees
                                .filter(e => e.id !== userId && (e.id === selectedTask.assigned_to || e.id === selectedTask.assigned_by || e.id === selectedTask.created_by))
                                .map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea value={threadText} onChange={e => setThreadText(e.target.value)} placeholder="اكتب تعليقاً..." rows={2} />
                        <Button size="sm" className="gap-1 w-full" onClick={() => handlePostComment(selectedTask.id)} disabled={!threadText.trim()}>
                          <Send className="w-3.5 h-3.5" />إرسال التعليق
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
