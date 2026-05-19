import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDb } from "@/lib/localStore";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  CalendarDays, BarChart3, Plus, Search, FileSpreadsheet, MapPin, Bell,
  Clock, ChevronLeft, ChevronRight, Pencil, Trash2,
} from "lucide-react";

interface GovernorateTraining {
  id: string;
  governorate: string;
  course_name: string;
  domain: string;
  course_hours: number;
  track: string;
  nominees_count: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: string;
  compliance: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FollowUpRecord {
  id: string;
  governorate_training_id: string;
  governorate: string;
  course_name: string;
  record_date: string;
  compliance_status: string;
  notes: string;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

interface FollowUpNotification {
  id: string;
  governorate: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_by: string;
  assigned_by_name: string;
  frequency: string;
  active: boolean;
  notes: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  planned: "مخططة", in_progress: "قيد التنفيذ", completed: "مكتملة", delayed: "متأخرة",
};
const statusColors: Record<string, string> = {
  planned: "neutral", in_progress: "info", completed: "success", delayed: "warning",
};
const complianceLabels: Record<string, string> = {
  on_track: "ملتزم", delayed: "متأخر", completed: "مكتمل", not_started: "لم يبدأ",
};
const complianceColors: Record<string, string> = {
  on_track: "success", delayed: "warning", completed: "success", not_started: "neutral",
};
const frequencyLabels: Record<string, string> = {
  daily: "يومي", weekly: "أسبوعي", biweekly: "نصف شهري", monthly: "شهري",
};
const calDot: Record<string, string> = {
  completed: "bg-success", in_progress: "bg-info", delayed: "bg-warning", planned: "bg-muted-foreground/50",
};

const emptyGovForm = {
  governorate: "", course_name: "", domain: "", course_hours: 0, track: "المسار الأول",
  nominees_count: 0, planned_start_date: "", planned_end_date: "",
  actual_start_date: "", actual_end_date: "", status: "planned",
  compliance: "not_started", notes: "",
};
const emptyFollowUpForm = {
  governorate: "", course_name: "",
  record_date: new Date().toISOString().split("T")[0],
  compliance_status: "on_track", notes: "",
};
const emptyNotifForm = {
  governorate: "", assigned_to: "", frequency: "weekly", notes: "",
};

const dayNames = ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const MonthCalendar = ({ trainings, month, onPrev, onNext }: {
  trainings: GovernorateTraining[]; month: Date; onPrev: () => void; onNext: () => void;
}) => {
  const y = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startDow = new Date(y, m, 1).getDay();
  const offset = (startDow + 1) % 7;

  const getForDay = (d: number) => {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return trainings.filter(t => ds >= t.planned_start_date && ds <= t.planned_end_date);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onPrev}><ChevronRight className="w-4 h-4" /></Button>
        <h3 className="font-bold text-foreground">{monthNames[m]} {y}</h3>
        <Button variant="outline" size="sm" onClick={onNext}><ChevronLeft className="w-4 h-4" /></Button>
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {dayNames.map(d => <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-foreground border-b border-border">{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (day === null) return <div key={di} className="min-h-[72px] border-b border-l border-border bg-muted/10" />;
              const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dt = getForDay(day);
              const isToday = ds === todayStr;
              return (
                <div key={di} className={`min-h-[72px] p-1 border-b border-l border-border ${isToday ? "bg-primary/5" : "bg-card"}`}>
                  <span className={`text-[10px] font-medium ${isToday ? "text-primary font-bold" : "text-foreground"}`}>{day}</span>
                  <div className="mt-0.5 space-y-px">
                    {dt.slice(0, 3).map((t, ti) => (
                      <div key={ti} className="flex items-center gap-1" title={`${t.course_name} — ${statusLabels[t.status] || t.status}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${calDot[t.status] || "bg-muted"}`} />
                        <span className="text-[8px] text-foreground truncate leading-tight">{t.course_name.replace("دورة ", "")}</span>
                      </div>
                    ))}
                    {dt.length > 3 && <span className="text-[7px] text-muted-foreground">+{dt.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground no-print">
        {Object.entries(calDot).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${c}`} />{statusLabels[s]}</span>
        ))}
      </div>
    </div>
  );
};

const TrainingPlan = () => {
  const { user } = useAuth();
  const { has, isManager, userId, userName } = useUserRole();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [govTrainings, setGovTrainings] = useState<GovernorateTraining[]>([]);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>([]);
  const [followUpNotifs, setFollowUpNotifs] = useState<FollowUpNotification[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);

  const [calMonth, setCalMonth] = useState(() => new Date());
  const [filterGov, setFilterGov] = useState("all");
  const [search, setSearch] = useState("");

  const [showGovForm, setShowGovForm] = useState(false);
  const [editingGov, setEditingGov] = useState<GovernorateTraining | null>(null);
  const [govForm, setGovForm] = useState(emptyGovForm);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);

  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifForm, setNotifForm] = useState(emptyNotifForm);

  const excelRef = useRef<HTMLInputElement>(null);
  const govExcelRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(() => {
    setGovTrainings(localDb.governorateTraining.getAll());
    setFollowUpRecords(localDb.followUpRecords.getAll());
    setFollowUpNotifs(localDb.followUpNotifications.getAll());
    setProfiles(localDb.profiles.getAll());
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const governorates = useMemo(() =>
    [...new Set(govTrainings.map(g => g.governorate))].sort((a, b) => a.localeCompare(b, "ar")),
    [govTrainings]);

  const filteredTrainings = useMemo(() => govTrainings.filter(t => {
    const matchGov = filterGov === "all" || t.governorate === filterGov;
    const matchSearch = !search || t.course_name.includes(search) || t.governorate.includes(search) || t.domain.includes(search);
    return matchGov && matchSearch;
  }), [govTrainings, filterGov, search]);

  const stats = useMemo(() => {
    const d = filterGov === "all" ? govTrainings : govTrainings.filter(t => t.governorate === filterGov);
    return {
      total: d.length,
      completed: d.filter(t => t.status === "completed").length,
      inProgress: d.filter(t => t.status === "in_progress").length,
      delayed: d.filter(t => t.status === "delayed").length,
      totalHours: d.reduce((s, t) => s + t.course_hours, 0),
      complianceRate: d.length > 0 ? Math.round(d.filter(t => t.compliance === "on_track" || t.compliance === "completed").length / d.length * 100) : 0,
    };
  }, [govTrainings, filterGov]);

  const calendarTrainings = useMemo(() =>
    filterGov === "all" ? govTrainings : govTrainings.filter(t => t.governorate === filterGov),
    [govTrainings, filterGov]);

  const coursesForGov = useMemo(() =>
    !followUpForm.governorate ? [] : govTrainings.filter(t => t.governorate === followUpForm.governorate),
    [govTrainings, followUpForm.governorate]);

  const handleSaveGov = () => {
    const payload = {
      ...govForm,
      actual_start_date: govForm.actual_start_date || null,
      actual_end_date: govForm.actual_end_date || null,
      created_by: user?.id || null,
    };
    if (editingGov) {
      localDb.governorateTraining.update(editingGov.id, payload);
      toast({ title: "تم", description: "تم تحديث بيانات المحافظة" });
    } else {
      localDb.governorateTraining.insert(payload);
      toast({ title: "تم", description: "تم إضافة بيانات المحافظة" });
    }
    setShowGovForm(false);
    setEditingGov(null);
    setGovForm(emptyGovForm);
    refreshData();
  };

  const handleDeleteGov = (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    localDb.governorateTraining.delete(id);
    toast({ title: "تم", description: "تم حذف البيانات" });
    refreshData();
  };

  const openEditGov = (item: GovernorateTraining) => {
    setEditingGov(item);
    setGovForm({
      governorate: item.governorate, course_name: item.course_name, domain: item.domain,
      course_hours: item.course_hours, track: item.track, nominees_count: item.nominees_count,
      planned_start_date: item.planned_start_date, planned_end_date: item.planned_end_date,
      actual_start_date: item.actual_start_date || "", actual_end_date: item.actual_end_date || "",
      status: item.status, compliance: item.compliance, notes: item.notes,
    });
    setShowGovForm(true);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, mode: "plan" | "gov") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        let imported = 0;

        const sheetName = mode === "plan"
          ? (wb.SheetNames.find(n => n.includes("الدورات") || n.includes("courses")) || wb.SheetNames[1] || wb.SheetNames[0])
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        for (const row of rows) {
          const gov = mode === "plan"
            ? String(row["المحافظة"] || row["governorate"] || "غير محدد").trim()
            : String(row["المحافظة"] || row["governorate"] || "").trim();
          const name = String(row["اسم الدورة"] || row["الدورة"] || row["course_name"] || "").trim();
          if (!name) continue;
          if (mode === "gov" && !gov) continue;

          localDb.governorateTraining.insert({
            governorate: gov,
            course_name: name,
            domain: String(row["المجال"] || row["domain"] || ""),
            course_hours: Number(row["الساعات"] || row["hours"] || row["عدد الساعات"] || 0),
            track: String(row["المسار"] || row["track"] || "المسار الأول"),
            nominees_count: Number(row["المرشحون"] || row["عدد المرشحين"] || row["nominees"] || 0),
            planned_start_date: String(row["تاريخ البدء"] || row["planned_start"] || row["start_date"] || "").slice(0, 10),
            planned_end_date: String(row["تاريخ الانتهاء"] || row["planned_end"] || row["end_date"] || "").slice(0, 10),
            actual_start_date: String(row["البدء الفعلي"] || row["actual_start"] || "").slice(0, 10) || null,
            actual_end_date: String(row["الانتهاء الفعلي"] || row["actual_end"] || "").slice(0, 10) || null,
            status: String(row["الحالة"] || row["status"] || "planned"),
            compliance: String(row["الالتزام"] || row["compliance"] || "not_started"),
            notes: String(row["ملاحظات"] || row["notes"] || ""),
            created_by: user?.id || null,
          });
          imported++;
        }

        toast({ title: "تم", description: imported > 0 ? `تم استيراد ${imported} سجل` : "لم يتم العثور على بيانات" });
        refreshData();
      } catch (err: unknown) {
        toast({ title: "خطأ", description: `فشل قراءة الملف: ${err instanceof Error ? err.message : "خطأ"}`, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleSaveFollowUp = () => {
    if (!followUpForm.governorate || !followUpForm.course_name) {
      toast({ title: "خطأ", description: "يرجى اختيار المحافظة والدورة", variant: "destructive" });
      return;
    }
    const matching = govTrainings.find(t => t.governorate === followUpForm.governorate && t.course_name === followUpForm.course_name);
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

  const exportData = () => {
    if (activeTab === "followup") {
      return {
        filename: "follow_up_records", sheetName: "سجلات المتابعة",
        rows: followUpRecords.map(r => ({
          المحافظة: r.governorate, "اسم الدورة": r.course_name,
          "تاريخ التسجيل": r.record_date, "حالة الالتزام": complianceLabels[r.compliance_status] || r.compliance_status,
          ملاحظات: r.notes, "سجل بواسطة": r.recorded_by_name,
        })),
      };
    }
    return {
      filename: "governorate_training", sheetName: "تدريب المحافظات",
      rows: filteredTrainings.map(t => ({
        المحافظة: t.governorate, "اسم الدورة": t.course_name, المجال: t.domain,
        الساعات: t.course_hours, المسار: t.track, "عدد المرشحين": t.nominees_count,
        "تاريخ البدء المخطط": t.planned_start_date, "تاريخ الانتهاء المخطط": t.planned_end_date,
        "البدء الفعلي": t.actual_start_date || "", "الانتهاء الفعلي": t.actual_end_date || "",
        الحالة: statusLabels[t.status] || t.status, الالتزام: complianceLabels[t.compliance] || t.compliance,
        ملاحظات: t.notes,
      })),
    };
  };

  const tabItems = [
    { value: "dashboard", label: "لوحة القيادة", icon: BarChart3 },
    { value: "entry", label: "الإدخال", icon: Plus },
    { value: "followup", label: "المتابعة", icon: Bell },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="الخطة التدريبية" subtitle="إدارة وتتبع تدريب المحافظات" icon={CalendarDays}
        sections={[{ id: "tabs_nav", label: "تبويبات الخطة" }, { id: "data_content", label: "محتوى البيانات" }]}
        exportData={exportData} />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 no-print">
          {tabItems.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5">
              <tab.icon className="w-3.5 h-3.5" /><span className="whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Dashboard ─── */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 no-print">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="ps-9" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                <button onClick={() => setFilterGov("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterGov === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  كل المحافظات</button>
                {governorates.map(g => (
                  <button key={g} onClick={() => setFilterGov(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterGov === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {g}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-print-section="stats">
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-primary">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">إجمالي الدورات</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-success">{stats.completed}</p>
                <p className="text-[10px] text-muted-foreground">مكتملة</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-warning">{stats.delayed}</p>
                <p className="text-[10px] text-muted-foreground">متأخرة</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-info">{stats.complianceRate}%</p>
                <p className="text-[10px] text-muted-foreground">نسبة الالتزام</p>
              </CardContent></Card>
            </div>

            <div data-print-section="calendar">
              <MonthCalendar trainings={calendarTrainings} month={calMonth}
                onPrev={() => setCalMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
                onNext={() => setCalMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-border" data-print-section="table">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">المحافظة</th>
                    <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">الدورة</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الساعات</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">المرشحون</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">البدء</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الانتهاء</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الحالة</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الالتزام</th>
                    <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.length > 0 ? filteredTrainings.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{t.governorate}</td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">{t.course_name}</td>
                      <td className="px-3 py-2 text-center">{t.course_hours}</td>
                      <td className="px-3 py-2 text-center">{t.nominees_count}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{t.planned_start_date}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{t.planned_end_date}</td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={statusLabels[t.status] || t.status} variant={statusColors[t.status] as "success" | "warning" | "info" | "neutral"} /></td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={complianceLabels[t.compliance] || t.compliance} variant={complianceColors[t.compliance] as "success" | "warning" | "info" | "neutral"} /></td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={t.notes}>{t.notes}</td>
                    </tr>
                  )) : <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Data Entry ─── */}
        <TabsContent value="entry" className="mt-4">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 no-print">
              {has("import_training_plan") && (<>
                <input type="file" ref={excelRef} accept=".xlsx,.xls" className="hidden"
                  onChange={e => handleImportExcel(e, "plan")} />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => excelRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4" />استيراد خطة تدريبية</Button>
              </>)}
              {has("import_training_plan") && (<>
                <input type="file" ref={govExcelRef} accept=".xlsx,.xls" className="hidden"
                  onChange={e => handleImportExcel(e, "gov")} />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => govExcelRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4" />استيراد بيانات المحافظات</Button>
              </>)}
              {has("add_governorate_training") && (
                <Button size="sm" className="gap-2"
                  onClick={() => { setEditingGov(null); setGovForm(emptyGovForm); setShowGovForm(true); }}>
                  <Plus className="w-4 h-4" />إضافة بيانات محافظة</Button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">المحافظة</th>
                    <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">الدورة</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الساعات</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">المسار</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">المرشحون</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">البدء</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الانتهاء</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الحالة</th>
                    {has("edit_governorate_training") && <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {govTrainings.length > 0 ? govTrainings.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{t.governorate}</td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">{t.course_name}</td>
                      <td className="px-3 py-2 text-center">{t.course_hours}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{t.track}</td>
                      <td className="px-3 py-2 text-center">{t.nominees_count}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{t.planned_start_date}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{t.planned_end_date}</td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={statusLabels[t.status] || t.status} variant={statusColors[t.status] as "success" | "warning" | "info" | "neutral"} /></td>
                      {has("edit_governorate_training") && (
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button onClick={() => openEditGov(t)} className="text-muted-foreground hover:text-foreground me-2"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteGov(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  )) : <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد بيانات — استورد من Excel أو أضف يدوياً</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <Dialog open={showGovForm} onOpenChange={setShowGovForm} dir="rtl">
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {editingGov ? "تعديل بيانات المحافظة" : "إضافة بيانات محافظة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">المحافظة</Label>
                    <Input value={govForm.governorate} onChange={e => setGovForm({ ...govForm, governorate: e.target.value })} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs">المجال</Label>
                    <Input value={govForm.domain} onChange={e => setGovForm({ ...govForm, domain: e.target.value })} className="mt-1 text-xs" /></div>
                </div>
                <div><Label className="text-xs">اسم الدورة</Label>
                  <Input value={govForm.course_name} onChange={e => setGovForm({ ...govForm, course_name: e.target.value })} className="mt-1 text-xs" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">الساعات</Label>
                    <Input type="number" value={govForm.course_hours} onChange={e => setGovForm({ ...govForm, course_hours: Number(e.target.value) })} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs">المسار</Label>
                    <Select value={govForm.track} onValueChange={v => setGovForm({ ...govForm, track: v })}>
                      <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="المسار الأول">المسار الأول</SelectItem>
                        <SelectItem value="المسار الثاني">المسار الثاني</SelectItem>
                      </SelectContent></Select></div>
                  <div><Label className="text-xs">المرشحون</Label>
                    <Input type="number" value={govForm.nominees_count} onChange={e => setGovForm({ ...govForm, nominees_count: Number(e.target.value) })} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">تاريخ البدء المخطط</Label>
                    <Input type="date" value={govForm.planned_start_date} onChange={e => setGovForm({ ...govForm, planned_start_date: e.target.value })} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs">تاريخ الانتهاء المخطط</Label>
                    <Input type="date" value={govForm.planned_end_date} onChange={e => setGovForm({ ...govForm, planned_end_date: e.target.value })} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">البدء الفعلي</Label>
                    <Input type="date" value={govForm.actual_start_date} onChange={e => setGovForm({ ...govForm, actual_start_date: e.target.value })} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs">الانتهاء الفعلي</Label>
                    <Input type="date" value={govForm.actual_end_date} onChange={e => setGovForm({ ...govForm, actual_end_date: e.target.value })} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">الحالة</Label>
                    <Select value={govForm.status} onValueChange={v => setGovForm({ ...govForm, status: v })}>
                      <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">مخططة</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="delayed">متأخرة</SelectItem>
                      </SelectContent></Select></div>
                  <div><Label className="text-xs">الالتزام</Label>
                    <Select value={govForm.compliance} onValueChange={v => setGovForm({ ...govForm, compliance: v })}>
                      <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">لم يبدأ</SelectItem>
                        <SelectItem value="on_track">ملتزم</SelectItem>
                        <SelectItem value="delayed">متأخر</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                      </SelectContent></Select></div>
                </div>
                <div><Label className="text-xs">ملاحظات</Label>
                  <Textarea value={govForm.notes} onChange={e => setGovForm({ ...govForm, notes: e.target.value })} className="mt-1 text-xs" rows={2} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setShowGovForm(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveGov} disabled={!govForm.governorate || !govForm.course_name}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Follow-up ─── */}
        <TabsContent value="followup" className="mt-4">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 no-print">
              {has("record_followup") && (
                <Button size="sm" className="gap-2" onClick={() => { setFollowUpForm(emptyFollowUpForm); setShowFollowUpForm(true); }}>
                  <Plus className="w-4 h-4" />تسجيل متابعة</Button>
              )}
              {isManager && (
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
                        </tr>
                      )) : <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سجلات متابعة</td></tr>}
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
                  <Select value={followUpForm.course_name} onValueChange={v => setFollowUpForm({ ...followUpForm, course_name: v })}
                    disabled={!followUpForm.governorate}>
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

export default TrainingPlan;
