import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCourses } from "@/hooks/useSupabaseData";
import { localDb } from "@/lib/localStore";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, Star, Users, UserCheck, Bell, Clock, ChevronDown, ChevronUp, Loader2, Plus, Trash2, ExternalLink } from "lucide-react";

interface FollowUpRecord {
  id: string; governorate_training_id: string; governorate: string; course_name: string;
  record_date: string; compliance_status: string; notes: string;
  recorded_by: string; recorded_by_name: string; created_at: string;
}
interface FollowUpNotification {
  id: string; governorate: string; assigned_to: string; assigned_to_name: string;
  assigned_by: string; assigned_by_name: string; frequency: string;
  active: boolean; notes: string; created_at: string;
}

const complianceLabels: Record<string, string> = { on_track: "ملتزم", delayed: "متأخر", completed: "مكتمل", not_started: "لم يبدأ" };
const complianceColors: Record<string, string> = { on_track: "success", delayed: "warning", completed: "success", not_started: "neutral" };
const frequencyLabels: Record<string, string> = { daily: "يومي", weekly: "أسبوعي", biweekly: "نصف شهري", monthly: "شهري" };

const emptyFollowUpForm = { governorate: "", course_name: "", record_date: new Date().toISOString().split("T")[0], compliance_status: "on_track", notes: "" };
const emptyNotifForm = { governorate: "", assigned_to: "", frequency: "weekly", notes: "" };

const Evaluation = () => {
  const { data: courses, loading } = useCourses();
  const { has, isManager, userId, userName } = useUserRole();
  const navigate = useNavigate();
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("evaluation");

  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>([]);
  const [followUpNotifs, setFollowUpNotifs] = useState<FollowUpNotification[]>([]);
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [govCourses, setGovCourses] = useState<{ id: string; governorate: string; course_name: string }[]>([]);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifForm, setNotifForm] = useState(emptyNotifForm);

  const refreshData = useCallback(() => {
    setFollowUpRecords(localDb.followUpRecords.getAll());
    setFollowUpNotifs(localDb.followUpNotifications.getAll());
    const gt = localDb.governorateTraining.getAll() as Array<{ id: string; governorate: string; course_name: string }>;
    setGovCourses(gt);
    setGovernorates([...new Set(gt.map(g => g.governorate))].sort((a, b) => a.localeCompare(b, "ar")));
    setProfiles(localDb.profiles.getAll());
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const coursesForGov = useMemo(() =>
    !followUpForm.governorate ? [] : govCourses.filter(c => c.governorate === followUpForm.governorate),
    [govCourses, followUpForm.governorate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const completedCourses = courses.filter((c) => c.status === "completed");
  const followUpNeeded = completedCourses.filter((c) => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const now = new Date();
    const diff = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 30;
  });

  const totalTrainees = courses.reduce((sum, c) => sum + (c.trainees?.length || 0), 0);
  const evaluationTypes = [
    { id: "trainee_evaluates_trainer", title: "تقييم المتدرب للمدرب", icon: Star, description: "يقوم المتدرب بتقييم أداء المدرب ومحتوى الدورة", count: totalTrainees || 1, completed: Math.round((totalTrainees || 1) * 0.6) },
    { id: "trainer_evaluates_trainee", title: "تقييم المدرب للمتدرب", icon: UserCheck, description: "يقوم المدرب بتقييم أداء المتدرب ومستوى تحصيله", count: totalTrainees || 1, completed: Math.round((totalTrainees || 1) * 0.75) },
    { id: "supervisor_evaluation", title: "تقييم المشرف", icon: Users, description: "يقوم المشرف بتقييم سير العملية التدريبية بشكل عام", count: courses.length || 1, completed: Math.round((courses.length || 1) * 0.7) },
  ];

  const handleSaveFollowUp = () => {
    if (!followUpForm.governorate || !followUpForm.course_name) {
      toast({ title: "خطأ", description: "يرجى اختيار المحافظة والدورة", variant: "destructive" });
      return;
    }
    const matching = govCourses.find(c => c.governorate === followUpForm.governorate && c.course_name === followUpForm.course_name);
    localDb.followUpRecords.insert({
      governorate_training_id: matching?.id || "",
      governorate: followUpForm.governorate,
      course_name: followUpForm.course_name,
      record_date: followUpForm.record_date,
      compliance_status: followUpForm.compliance_status,
      notes: followUpForm.notes,
      recorded_by: userId,
      recorded_by_name: userName,
    });
    if (matching) localDb.governorateTraining.update(matching.id, { compliance: followUpForm.compliance_status });

    const assigned = followUpNotifs.filter(n => n.governorate === followUpForm.governorate && n.active);
    for (const nf of assigned) {
      localDb.notifications.insert({
        user_id: nf.assigned_to,
        message: `متابعة ${followUpForm.governorate}: ${complianceLabels[followUpForm.compliance_status]} — ${followUpForm.course_name}`,
        type: followUpForm.compliance_status === "delayed" ? "warning" : "info",
        link: "/training-plan",
      });
    }
    toast({ title: "تم", description: "تم تسجيل المتابعة" });
    setShowFollowUpForm(false);
    setFollowUpForm(emptyFollowUpForm);
    refreshData();
  };

  const handleSaveNotif = () => {
    const u = profiles.find(p => p.id === notifForm.assigned_to);
    if (!notifForm.governorate || !notifForm.assigned_to) {
      toast({ title: "خطأ", description: "يرجى اختيار المحافظة والمستخدم", variant: "destructive" });
      return;
    }
    localDb.followUpNotifications.insert({
      governorate: notifForm.governorate,
      assigned_to: notifForm.assigned_to,
      assigned_to_name: u?.name || "",
      assigned_by: userId,
      assigned_by_name: userName,
      frequency: notifForm.frequency,
      active: true,
      notes: notifForm.notes,
    });
    toast({ title: "تم", description: "تم إعداد إشعار المتابعة" });
    setShowNotifForm(false);
    setNotifForm(emptyNotifForm);
    refreshData();
  };

  const handleDeleteNotif = (id: string) => {
    localDb.followUpNotifications.delete(id);
    toast({ title: "تم", description: "تم حذف إعداد الإشعار" });
    refreshData();
  };

  const handleToggleNotif = (id: string, active: boolean) => {
    localDb.followUpNotifications.update(id, { active: !active });
    refreshData();
  };

  const tabItems = [
    { value: "evaluation", label: "التقييم", icon: ClipboardCheck },
    { value: "followup", label: "متابعة المحافظات", icon: Bell },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="التقييم والمتابعة" subtitle="نماذج التقييم ومتابعة أثر التدريب والمحافظات" icon={ClipboardCheck} sections={[
        { id: "tabs_nav", label: "التبويبات" },
        { id: "evaluation_types", label: "أنواع التقييم" },
        { id: "follow_up", label: "المتابعة" },
      ]} exportData={() => ({
        filename: "evaluation",
        rows: activeTab === "followup"
          ? followUpRecords.map(r => ({ المحافظة: r.governorate, "اسم الدورة": r.course_name, "تاريخ التسجيل": r.record_date, "حالة الالتزام": complianceLabels[r.compliance_status] || r.compliance_status, ملاحظات: r.notes, "سجل بواسطة": r.recorded_by_name }))
          : courses.map(c => ({ الدورة: c.title, المدرب: c.trainer || "", الحالة: c.status, المتدربون: c.trainees?.length || 0, البداية: c.start_date, النهاية: c.end_date }))
      })} />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 no-print">
          {tabItems.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5">
              <tab.icon className="w-3.5 h-3.5" /><span className="whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="evaluation" className="mt-4">
          <div data-print-section="evaluation_types" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {evaluationTypes.map((et) => (
              <div key={et.id} className="bg-card rounded-xl border border-border p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedType(expandedType === et.id ? null : et.id)}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><et.icon className="w-5 h-5 text-primary" /></div>
                  {expandedType === et.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
                <h3 className="font-bold text-foreground mt-3">{et.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{et.description}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">التقدم</span><span className="font-semibold text-foreground">{et.completed}/{et.count}</span></div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(et.completed / et.count) * 100}%` }} /></div>
                </div>
                {expandedType === et.id && (
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    {completedCourses.length > 0 ? completedCourses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5"><span className="text-sm text-foreground">{c.title}</span><StatusBadge status="مكتمل" variant="success" /></div>
                    )) : <p className="text-sm text-muted-foreground">لا توجد دورات مكتملة</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div data-print-section="follow_up" className="bg-card rounded-xl border border-border p-5 mt-4">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-warning" />متابعة أثر التدريب</h2>
            <p className="text-sm text-muted-foreground mb-4">الدورات التي مضى عليها 30 يوماً بعد الانتهاء ويجب متابعة أثرها التدريبي</p>
            {followUpNeeded.length > 0 ? (
              <div className="space-y-3">
                {followUpNeeded.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-warning/5 border border-warning/20 rounded-lg p-4">
                    <div>
                      <p className="font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">انتهت بتاريخ: {c.end_date} • المتدربون: {(c.trainees || []).filter((t) => t.status === "passed").length} ناجح</p>
                    </div>
                    <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-warning" /><StatusBadge status="يحتاج متابعة" variant="warning" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا توجد دورات تحتاج متابعة حالياً</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="followup" className="mt-4">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 no-print">
              {has("record_followup") && (
                <Button size="sm" className="gap-2" onClick={() => { setFollowUpForm(emptyFollowUpForm); setShowFollowUpForm(true); }}>
                  <Plus className="w-4 h-4" />تسجيل متابعة</Button>
              )}
              {has("manage_followup") && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => { setNotifForm(emptyNotifForm); setShowNotifForm(true); }}>
                  <Bell className="w-4 h-4" />إعداد إشعار متابعة</Button>
              )}
            </div>

            <Card>
              <div className="bg-primary/5 px-4 py-2.5 border-b border-border">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />سجلات المتابعة</h3>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="px-3 py-2 text-start font-semibold text-foreground">المحافظة</th>
                        <th className="px-3 py-2 text-start font-semibold text-foreground">الدورة</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">تاريخ التسجيل</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground">الالتزام</th>
                        <th className="px-3 py-2 text-start font-semibold text-foreground">ملاحظات</th>
                        <th className="px-3 py-2 text-start font-semibold text-foreground">سجل بواسطة</th>
                        <th className="px-3 py-2 text-center font-semibold text-foreground">الخطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpRecords.length > 0 ? followUpRecords.map(r => (
                        <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-1.5 font-medium text-foreground">{r.governorate}</td>
                          <td className="px-3 py-1.5 text-foreground">{r.course_name}</td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">{r.record_date}</td>
                          <td className="px-3 py-1.5 text-center"><StatusBadge status={complianceLabels[r.compliance_status] || r.compliance_status} variant={complianceColors[r.compliance_status] as "success" | "warning" | "info" | "neutral"} /></td>
                          <td className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate" title={r.notes}>{r.notes}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.recorded_by_name}</td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => navigate(`/training-plan?gov=${encodeURIComponent(r.governorate)}`)} className="text-primary hover:text-primary/80"><ExternalLink className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      )) : <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد سجلات متابعة</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {isManager && (
              <Card>
                <div className="bg-warning/5 px-4 py-2.5 border-b border-border">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><Bell className="w-4 h-4 text-warning" />إعدادات إشعارات المتابعة</h3>
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <th className="px-3 py-2 text-start font-semibold text-foreground">المحافظة</th>
                          <th className="px-3 py-2 text-start font-semibold text-foreground">المكلف</th>
                          <th className="px-3 py-2 text-center font-semibold text-foreground">التكرار</th>
                          <th className="px-3 py-2 text-center font-semibold text-foreground">نشط</th>
                          <th className="px-3 py-2 text-start font-semibold text-foreground">ملاحظات</th>
                          <th className="px-3 py-2 text-center font-semibold text-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {followUpNotifs.length > 0 ? followUpNotifs.map(n => (
                          <tr key={n.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-1.5 font-medium text-foreground">{n.governorate}</td>
                            <td className="px-3 py-1.5 text-foreground">{n.assigned_to_name}</td>
                            <td className="px-3 py-1.5 text-center">{frequencyLabels[n.frequency] || n.frequency}</td>
                            <td className="px-3 py-1.5 text-center">
                              <button onClick={() => handleToggleNotif(n.id, n.active)}
                                className={`px-2 py-0.5 rounded text-[10px] ${n.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                                {n.active ? "نشط" : "معطل"}</button></td>
                            <td className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate" title={n.notes}>{n.notes}</td>
                            <td className="px-3 py-1.5 text-center">
                              <button onClick={() => handleDeleteNotif(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        )) : <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد إعدادات إشعارات</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isManager && (
              <Card>
                <div className="bg-info/5 px-4 py-2.5 border-b border-border">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><Bell className="w-4 h-4 text-info" />مهام المتابعة المسندة إليّ</h3>
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <th className="px-3 py-2 text-start font-semibold text-foreground">المحافظة</th>
                          <th className="px-3 py-2 text-center font-semibold text-foreground">التكرار</th>
                          <th className="px-3 py-2 text-start font-semibold text-foreground">ملاحظات</th>
                          <th className="px-3 py-2 text-center font-semibold text-foreground">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const mine = followUpNotifs.filter(n => n.assigned_to === userId && n.active);
                          return mine.length > 0 ? mine.map(n => (
                            <tr key={n.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-1.5 font-medium text-foreground">{n.governorate}</td>
                              <td className="px-3 py-1.5 text-center">{frequencyLabels[n.frequency] || n.frequency}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{n.notes}</td>
                              <td className="px-3 py-1.5 text-center"><span className="px-2 py-0.5 rounded text-[10px] bg-info/20 text-info">نشط</span></td>
                            </tr>
                          )) : <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد مهام متابعة مسندة إليك</td></tr>;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Dialog open={showFollowUpForm} onOpenChange={setShowFollowUpForm} dir="rtl">
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />تسجيل متابعة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className="text-xs">المحافظة</Label>
                  <Select value={followUpForm.governorate} onValueChange={v => setFollowUpForm({ ...followUpForm, governorate: v, course_name: "" })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    <SelectContent>{governorates.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">الدورة</Label>
                  <Select value={followUpForm.course_name} onValueChange={v => setFollowUpForm({ ...followUpForm, course_name: v })} disabled={!followUpForm.governorate}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="اختر الدورة" /></SelectTrigger>
                    <SelectContent>{coursesForGov.map(c => <SelectItem key={c.id} value={c.course_name}>{c.course_name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">تاريخ التسجيل</Label>
                  <Input type="date" value={followUpForm.record_date} onChange={e => setFollowUpForm({ ...followUpForm, record_date: e.target.value })} className="mt-1 text-xs" /></div>
                <div><Label className="text-xs">حالة الالتزام</Label>
                  <Select value={followUpForm.compliance_status} onValueChange={v => setFollowUpForm({ ...followUpForm, compliance_status: v })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_track">ملتزم</SelectItem>
                      <SelectItem value="delayed">متأخر</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="not_started">لم يبدأ</SelectItem>
                    </SelectContent></Select></div>
                <div><Label className="text-xs">ملاحظات</Label>
                  <Textarea value={followUpForm.notes} onChange={e => setFollowUpForm({ ...followUpForm, notes: e.target.value })} className="mt-1 text-xs" rows={2} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setShowFollowUpForm(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveFollowUp} disabled={!followUpForm.governorate || !followUpForm.course_name}>تسجيل</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNotifForm} onOpenChange={setShowNotifForm} dir="rtl">
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />إعداد إشعار متابعة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className="text-xs">المحافظة</Label>
                  {governorates.length > 0 ? (
                    <Select value={notifForm.governorate} onValueChange={v => setNotifForm({ ...notifForm, governorate: v })}>
                      <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                      <SelectContent>{governorates.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
                  ) : <Input value={notifForm.governorate} onChange={e => setNotifForm({ ...notifForm, governorate: e.target.value })} className="mt-1 text-xs" placeholder="أدخل اسم المحافظة" />}</div>
                <div><Label className="text-xs">المستخدم المكلف</Label>
                  <Select value={notifForm.assigned_to} onValueChange={v => setNotifForm({ ...notifForm, assigned_to: v })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="اختر المستخدم" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">التكرار</Label>
                  <Select value={notifForm.frequency} onValueChange={v => setNotifForm({ ...notifForm, frequency: v })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومي</SelectItem>
                      <SelectItem value="weekly">أسبوعي</SelectItem>
                      <SelectItem value="biweekly">نصف شهري</SelectItem>
                      <SelectItem value="monthly">شهري</SelectItem>
                    </SelectContent></Select></div>
                <div><Label className="text-xs">ملاحظات</Label>
                  <Textarea value={notifForm.notes} onChange={e => setNotifForm({ ...notifForm, notes: e.target.value })} className="mt-1 text-xs" rows={2} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNotifForm(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveNotif} disabled={!notifForm.governorate || !notifForm.assigned_to}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Evaluation;
