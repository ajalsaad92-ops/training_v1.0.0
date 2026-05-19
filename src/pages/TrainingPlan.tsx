import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import IraqMap, { type GovStats } from "@/components/IraqMap";
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
import { CalendarDays, BarChart3, Plus, Search, FileSpreadsheet, MapPin, ChevronLeft, ChevronRight, Pencil, Trash2, Clock, ExternalLink } from "lucide-react";

interface GovernorateTraining {
  id: string; governorate: string; course_name: string; domain: string;
  course_hours: number; track: string; nominees_count: number;
  planned_start_date: string; planned_end_date: string;
  actual_start_date: string | null; actual_end_date: string | null;
  status: string; compliance: string; notes: string;
  created_by: string | null; created_at: string; updated_at: string;
}
interface WeekSchedule {
  id: string; governorate: string; week: number;
  start_date: string; end_date: string; label: string;
}

const statusLabels = { planned: "مخططة", in_progress: "قيد التنفيذ", completed: "مكتملة", delayed: "متأخرة" };
const statusColors = { planned: "neutral", in_progress: "info", completed: "success", delayed: "warning" };
const complianceLabels = { on_track: "ملتزم", delayed: "متأخر", completed: "مكتمل", not_started: "لم يبدأ" };
const complianceColors = { on_track: "success", delayed: "warning", completed: "success", not_started: "neutral" };
const trackLabels = { "المسار الأول": "المسار الأول / القاعة A", "المسار الثاني": "المسار الثاني / القاعة B" };
const emptyGovForm = { governorate: "", course_name: "", domain: "", course_hours: 0, track: "المسار الأول", nominees_count: 0, planned_start_date: "", planned_end_date: "", actual_start_date: "", actual_end_date: "", status: "planned", compliance: "not_started", notes: "" };
const emptyWeekForm = { governorate: "", week: 1, start_date: "", end_date: "", label: "" };
const ALL_19_GOVERNORATES = ["دهوك","نينوى","أربيل","السليمانية","حلبجة","كركوك","صلاح الدين","ديالى","الأنبار","بغداد","واسط","بابل","كربلاء","النجف","القادسية","ميسان","المثنى","ذي قار","البصرة"];

const ARABIC_DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function MonthCalendar({ trainings, weekSchedules, calMonth, setCalMonth }: {
  trainings: GovernorateTraining[];
  weekSchedules: WeekSchedule[];
  calMonth: Date;
  setCalMonth: (d: Date) => void;
}) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const weeks: (Date | null)[][] = [];
  let current: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) {
    current.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    current.push(new Date(year, month, d));
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    while (current.length < 7) current.push(null);
    weeks.push(current);
  }

  const dateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const coursesOnDay = (day: Date) => {
    const ds = dateStr(day);
    return trainings.filter(t => {
      const s = t.planned_start_date || t.actual_start_date;
      const e = t.planned_end_date || t.actual_end_date;
      return s && e && ds >= s && ds <= e;
    });
  };

  const weekOnDay = (day: Date) => {
    const ds = dateStr(day);
    return weekSchedules.find(w => ds >= w.start_date && ds <= w.end_date);
  };

  const statusDotColor: Record<string, string> = {
    planned: "bg-slate-400",
    in_progress: "bg-blue-400",
    completed: "bg-green-400",
    delayed: "bg-amber-400",
  };

  const monthName = calMonth.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={() => setCalMonth(new Date(year, month - 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-sm">{monthName}</span>
        <Button variant="ghost" size="sm" onClick={() => setCalMonth(new Date(year, month + 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-[10px] mb-1">
        {ARABIC_DAYS.map(d => <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {weeks.flatMap((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              const prevDay = prevMonthDays - startDow + di + 1;
              return <div key={`${wi}-${di}`} className="h-16 border p-0.5 text-muted-foreground/30 text-[9px]">{prevDay}</div>;
            }
            const courses = coursesOnDay(day);
            const wk = weekOnDay(day);
            const isToday = dateStr(day) === new Date().toISOString().split("T")[0];
            return (
              <div key={`${wi}-${di}`} className={`h-16 border p-0.5 relative ${wk ? "bg-blue-50/50" : ""}`}>
                <span className={`text-[10px] ${isToday ? "bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center" : ""}`}>
                  {day.getDate()}
                </span>
                {courses.length > 0 && (
                  <div className="flex flex-wrap gap-px mt-0.5">
                    {courses.slice(0, 4).map((c, ci) => (
                      <span key={ci} className={`w-1.5 h-1.5 rounded-full ${statusDotColor[c.status] || "bg-slate-300"}`} title={c.course_name} />
                    ))}
                    {courses.length > 4 && <span className="text-[7px] text-muted-foreground">+{courses.length-4}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TrainingPlan() {
  const navigate = useNavigate();
  const { has } = useUserRole();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedGov, setSelectedGov] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterGov, setFilterGov] = useState<string | null>(null);
  const [govTrainings, setGovTrainings] = useState<GovernorateTraining[]>([]);
  const [weekSchedules, setWeekSchedules] = useState<WeekSchedule[]>([]);
  const [showGovForm, setShowGovForm] = useState(false);
  const [editingGov, setEditingGov] = useState<GovernorateTraining | null>(null);
  const [govForm, setGovForm] = useState(emptyGovForm);
  const [showWeekForm, setShowWeekForm] = useState(false);
  const [editingWeek, setEditingWeek] = useState<WeekSchedule | null>(null);
  const [weekForm, setWeekForm] = useState(emptyWeekForm);
  const [calMonth, setCalMonth] = useState(new Date());
  const excelRef = useRef<HTMLInputElement>(null);
  const govExcelRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(() => {
    setGovTrainings(localDb.governorateTraining.getAll() as GovernorateTraining[]);
    setWeekSchedules(localDb.weekSchedules.getAll() as WeekSchedule[]);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const governorates = useMemo(() => [...new Set(govTrainings.map(g => g.governorate))].sort(), [govTrainings]);

  const mapStats = useMemo(() => {
    const stats: Record<string, GovStats> = {};
    for (const t of govTrainings) {
      if (!stats[t.governorate]) {
        stats[t.governorate] = { totalCourses: 0, completed: 0, inProgress: 0, delayed: 0, complianceRate: 0 };
      }
      stats[t.governorate].totalCourses++;
      if (t.status === "completed") stats[t.governorate].completed++;
      if (t.status === "in_progress") stats[t.governorate].inProgress++;
      if (t.status === "delayed") stats[t.governorate].delayed++;
    }
    for (const g of Object.keys(stats)) {
      const s = stats[g];
      const onTrack = govTrainings.filter(t => t.governorate === g && (t.compliance === "on_track" || t.compliance === "completed")).length;
      s.complianceRate = s.totalCourses > 0 ? Math.round((onTrack / s.totalCourses) * 100) : 0;
    }
    return stats;
  }, [govTrainings]);

  const filteredTrainings = useMemo(() => {
    let list = govTrainings;
    const govFilter = selectedGov || filterGov;
    if (govFilter) list = list.filter(t => t.governorate === govFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.course_name.toLowerCase().includes(q) ||
        t.governorate.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q)
      );
    }
    return list;
  }, [govTrainings, selectedGov, filterGov, search]);

  const stats = useMemo(() => {
    const total = filteredTrainings.length;
    const completed = filteredTrainings.filter(t => t.status === "completed").length;
    const inProgress = filteredTrainings.filter(t => t.status === "in_progress").length;
    const delayed = filteredTrainings.filter(t => t.status === "delayed").length;
    const totalHours = filteredTrainings.reduce((s, t) => s + (t.course_hours || 0), 0);
    const compliant = filteredTrainings.filter(t => t.compliance === "on_track" || t.compliance === "completed").length;
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { total, completed, inProgress, delayed, totalHours, complianceRate };
  }, [filteredTrainings]);

  const selectedGovTrainings = useMemo(() =>
    selectedGov ? govTrainings.filter(t => t.governorate === selectedGov) : [],
    [selectedGov, govTrainings]
  );

  const selectedGovWeeks = useMemo(() =>
    selectedGov ? weekSchedules.filter(w => w.governorate === selectedGov).sort((a, b) => a.week - b.week) : [],
    [selectedGov, weekSchedules]
  );

  const selectedGovStats = useMemo(() => {
    if (!selectedGov) return null;
    const total = selectedGovTrainings.length;
    const completed = selectedGovTrainings.filter(t => t.status === "completed").length;
    const inProgress = selectedGovTrainings.filter(t => t.status === "in_progress").length;
    const delayed = selectedGovTrainings.filter(t => t.status === "delayed").length;
    const compliant = selectedGovTrainings.filter(t => t.compliance === "on_track" || t.compliance === "completed").length;
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { total, completed, inProgress, delayed, complianceRate };
  }, [selectedGov, selectedGovTrainings]);

  const openAddGov = () => {
    setEditingGov(null);
    setGovForm(emptyGovForm);
    setShowGovForm(true);
  };

  const openEditGov = (t: GovernorateTraining) => {
    setEditingGov(t);
    setGovForm({
      governorate: t.governorate,
      course_name: t.course_name,
      domain: t.domain,
      course_hours: t.course_hours,
      track: t.track,
      nominees_count: t.nominees_count,
      planned_start_date: t.planned_start_date,
      planned_end_date: t.planned_end_date,
      actual_start_date: t.actual_start_date || "",
      actual_end_date: t.actual_end_date || "",
      status: t.status,
      compliance: t.compliance,
      notes: t.notes || "",
    });
    setShowGovForm(true);
  };

  const saveGov = () => {
    const data = {
      ...govForm,
      course_hours: Number(govForm.course_hours) || 0,
      nominees_count: Number(govForm.nominees_count) || 0,
      actual_start_date: govForm.actual_start_date || null,
      actual_end_date: govForm.actual_end_date || null,
      created_by: user?.id || null,
    };
    if (editingGov) {
      localDb.governorateTraining.update(editingGov.id, data);
    } else {
      localDb.governorateTraining.insert(data);
    }
    refreshData();
    setShowGovForm(false);
    toast({ title: editingGov ? "تم تحديث البيانات" : "تم إضافة البيانات" });
  };

  const deleteGov = (id: string) => {
    localDb.governorateTraining.delete(id);
    refreshData();
    toast({ title: "تم حذف البيانات" });
  };

  const openAddWeek = () => {
    setEditingWeek(null);
    setWeekForm({ ...emptyWeekForm, governorate: selectedGov || "" });
    setShowWeekForm(true);
  };

  const openEditWeek = (w: WeekSchedule) => {
    setEditingWeek(w);
    setWeekForm({ governorate: w.governorate, week: w.week, start_date: w.start_date, end_date: w.end_date, label: w.label });
    setShowWeekForm(true);
  };

  const saveWeek = () => {
    const data = { ...weekForm, week: Number(weekForm.week) || 1 };
    if (editingWeek) {
      localDb.weekSchedules.update(editingWeek.id, data);
    } else {
      localDb.weekSchedules.insert(data);
    }
    refreshData();
    setShowWeekForm(false);
    toast({ title: editingWeek ? "تم تحديث الأسبوع" : "تم إضافة الأسبوع" });
  };

  const deleteWeek = (id: string) => {
    localDb.weekSchedules.delete(id);
    refreshData();
    toast({ title: "تم حذف الأسبوع" });
  };

  const mapColumnToField = (header: string, value: unknown): [string, unknown] | null => {
    const h = String(header).trim();
    const v = value;
    if (["اسم الدورة","الدورة","course_name"].includes(h)) return ["course_name", v];
    if (["المحافظة","governorate"].includes(h)) return ["governorate", v];
    if (["المجال","domain"].includes(h)) return ["domain", v];
    if (["الساعات","hours","course_hours"].includes(h)) return ["course_hours", Number(v) || 0];
    if (["المسار","track"].includes(h)) return ["track", v];
    if (["المرشحون","عدد المرشحين","nominees","nominees_count"].includes(h)) return ["nominees_count", Number(v) || 0];
    if (["تاريخ البدء","planned_start","start_date"].includes(h)) return ["planned_start_date", parseExcelDate(v)];
    if (["تاريخ الانتهاء","planned_end","end_date"].includes(h)) return ["planned_end_date", parseExcelDate(v)];
    if (["الحالة","status"].includes(h)) return ["status", mapStatusValue(String(v))];
    if (["الالتزام","compliance"].includes(h)) return ["compliance", mapComplianceValue(String(v))];
    if (["ملاحظات","notes"].includes(h)) return ["notes", v];
    return null;
  };

  const parseExcelDate = (v: unknown): string => {
    if (!v) return "";
    if (typeof v === "number") {
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().split("T")[0];
    }
    const s = String(v).trim();
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return s;
  };

  const mapStatusValue = (s: string): string => {
    const map: Record<string, string> = { "مخططة": "planned", "قيد التنفيذ": "in_progress", "مكتملة": "completed", "متأخرة": "delayed", planned: "planned", in_progress: "in_progress", completed: "completed", delayed: "delayed" };
    return map[s] || s;
  };

  const mapComplianceValue = (s: string): string => {
    const map: Record<string, string> = { "ملتزم": "on_track", "متأخر": "delayed", "مكتمل": "completed", "لم يبدأ": "not_started", on_track: "on_track", delayed: "delayed", completed: "completed", not_started: "not_started" };
    return map[s] || s;
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, mode: "full_plan" | "gov_only") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      let totalImported = 0;

      if (mode === "full_plan") {
        const sheetNames = wb.SheetNames;
        localDb.trainingPlanImports.insert({ filename: file.name, sheet_count: sheetNames.length, imported_at: new Date().toISOString() });
        for (const sheetName of sheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws);
          for (const row of rows) {
            const record: Record<string, unknown> = {};
            for (const [header, value] of Object.entries(row as Record<string, unknown>)) {
              const mapped = mapColumnToField(header, value);
              if (mapped) record[mapped[0]] = mapped[1];
            }
            if (record.course_name || record.governorate) {
              localDb.governorateTraining.insert({
                ...emptyGovForm,
                ...record,
                created_by: user?.id || null,
              });
              totalImported++;
            }
          }
        }
      } else {
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        for (const row of rows) {
          const record: Record<string, unknown> = {};
          for (const [header, value] of Object.entries(row as Record<string, unknown>)) {
            const mapped = mapColumnToField(header, value);
            if (mapped) record[mapped[0]] = mapped[1];
          }
          if (record.course_name || record.governorate) {
            localDb.governorateTraining.insert({
              ...emptyGovForm,
              ...record,
              created_by: user?.id || null,
            });
            totalImported++;
          }
        }
      }

      refreshData();
      toast({ title: `تم استيراد ${totalImported} سجل` });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const exportData = () => {
    const rows = filteredTrainings.map(t => ({
      "المحافظة": t.governorate,
      "اسم الدورة": t.course_name,
      "المجال": t.domain,
      "الساعات": t.course_hours,
      "المسار": trackLabels[t.track as keyof typeof trackLabels] || t.track,
      "عدد المرشحين": t.nominees_count,
      "تاريخ البدء": t.planned_start_date,
      "تاريخ الانتهاء": t.planned_end_date,
      "تاريخ البدء الفعلي": t.actual_start_date || "",
      "تاريخ الانتهاء الفعلي": t.actual_end_date || "",
      "الحالة": statusLabels[t.status as keyof typeof statusLabels] || t.status,
      "الالتزام": complianceLabels[t.compliance as keyof typeof complianceLabels] || t.compliance,
      "ملاحظات": t.notes,
    }));
    return { rows, filename: "خطة_التدريب_المحافظات", sheetName: "البيانات" };
  };

  const handleGovClick = (name: string) => {
    setSelectedGov(name);
    setFilterGov(null);
  };

  const handleStatCardClick = (statusFilter: string | null) => {
    if (!selectedGov) return;
    if (statusFilter) {
      setFilterGov(selectedGov);
      setSearch("");
      setActiveTab("dashboard");
    }
  };

  const weekSchedulesByGov = useMemo(() => {
    const grouped: Record<string, WeekSchedule[]> = {};
    for (const w of weekSchedules) {
      if (!grouped[w.governorate]) grouped[w.governorate] = [];
      grouped[w.governorate].push(w);
    }
    for (const g of Object.keys(grouped)) {
      grouped[g].sort((a, b) => a.week - b.week);
    }
    return grouped;
  }, [weekSchedules]);

  const statusFilterRef = useRef<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const displayTrainings = useMemo(() => {
    let list = filteredTrainings;
    if (statusFilter) {
      list = list.filter(t => t.status === statusFilter);
    }
    return list;
  }, [filteredTrainings, statusFilter]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="الخطة التدريبية للمحافظات"
        subtitle="إدارة ومتابعة الدورات التدريبية في المحافظات"
        icon={CalendarDays}
        sections={[{ id: "map_view", label: "خارطة المحافظات" }, { id: "data_content", label: "محتوى البيانات" }]}
        exportData={exportData}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-3">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />لوحة القيادة
          </TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />الإدخال
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" data-print-section="map_view">
          <IraqMap stats={mapStats} onGovernorateClick={handleGovClick} selectedGovernorate={selectedGov} />

          {selectedGov && selectedGovStats && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedGov(null); setFilterGov(null); setStatusFilter(null); }}>
                  <ChevronRight className="w-4 h-4" />رجوع للخارطة
                </Button>
                <span className="font-bold text-lg flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />{selectedGov}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setStatusFilter(null)}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedGovStats.total}</p>
                    <p className="text-[11px] text-muted-foreground">إجمالي الدورات</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 hover:ring-green-400/30 transition-all" onClick={() => setStatusFilter("completed")}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedGovStats.completed}</p>
                    <p className="text-[11px] text-muted-foreground">مكتملة</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 hover:ring-amber-400/30 transition-all" onClick={() => setStatusFilter("delayed")}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{selectedGovStats.delayed}</p>
                    <p className="text-[11px] text-muted-foreground">متأخرة</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedGovStats.complianceRate}%</p>
                    <p className="text-[11px] text-muted-foreground">نسبة الالتزام</p>
                  </CardContent>
                </Card>
              </div>

              {selectedGovWeeks.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />جدول الأسابيع
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedGovWeeks.map(w => (
                      <span key={w.id} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
                        {w.label}: {w.start_date} — {w.end_date}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <MonthCalendar
                trainings={selectedGovTrainings}
                weekSchedules={selectedGovWeeks}
                calMonth={calMonth}
                setCalMonth={setCalMonth}
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-right">الدورة</th>
                      <th className="p-2 text-right">المجال</th>
                      <th className="p-2 text-center">المسار</th>
                      <th className="p-2 text-center">الساعات</th>
                      <th className="p-2 text-center">المرشحون</th>
                      <th className="p-2 text-center">تاريخ البدء</th>
                      <th className="p-2 text-center">تاريخ الانتهاء</th>
                      <th className="p-2 text-center">الحالة</th>
                      <th className="p-2 text-center">الالتزام</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statusFilter ? selectedGovTrainings.filter(t => t.status === statusFilter) : selectedGovTrainings).map(t => (
                      <tr key={t.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">{t.course_name}</td>
                        <td className="p-2">{t.domain}</td>
                        <td className="p-2 text-center">{trackLabels[t.track as keyof typeof trackLabels] || t.track}</td>
                        <td className="p-2 text-center">{t.course_hours}</td>
                        <td className="p-2 text-center">{t.nominees_count}</td>
                        <td className="p-2 text-center">{t.planned_start_date}</td>
                        <td className="p-2 text-center">{t.planned_end_date}</td>
                        <td className="p-2 text-center"><StatusBadge status={statusLabels[t.status as keyof typeof statusLabels] || t.status} variant={statusColors[t.status as keyof typeof statusColors] as any} /></td>
                        <td className="p-2 text-center"><StatusBadge status={complianceLabels[t.compliance as keyof typeof complianceLabels] || t.compliance} variant={complianceColors[t.compliance as keyof typeof complianceColors] as any} /></td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/courses?search=${encodeURIComponent(t.course_name)}`)}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedGov && (
            <div className="mt-4 space-y-4" data-print-section="data_content">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{stats.total}</p><p className="text-[11px] text-muted-foreground">إجمالي الدورات</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-[11px] text-muted-foreground">مكتملة</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p><p className="text-[11px] text-muted-foreground">قيد التنفيذ</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-amber-600">{stats.delayed}</p><p className="text-[11px] text-muted-foreground">متأخرة</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-purple-600">{stats.complianceRate}%</p><p className="text-[11px] text-muted-foreground">نسبة الالتزام</p></CardContent></Card>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
                </div>
                <Select value={filterGov || "__all__"} onValueChange={v => setFilterGov(v === "__all__" ? null : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">الكل</SelectItem>
                    {governorates.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-right">المحافظة</th>
                      <th className="p-2 text-right">الدورة</th>
                      <th className="p-2 text-right">المجال</th>
                      <th className="p-2 text-center">المسار</th>
                      <th className="p-2 text-center">الساعات</th>
                      <th className="p-2 text-center">المرشحون</th>
                      <th className="p-2 text-center">تاريخ البدء</th>
                      <th className="p-2 text-center">تاريخ الانتهاء</th>
                      <th className="p-2 text-center">الحالة</th>
                      <th className="p-2 text-center">الالتزام</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainings.map(t => (
                      <tr key={t.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">{t.governorate}</td>
                        <td className="p-2">{t.course_name}</td>
                        <td className="p-2">{t.domain}</td>
                        <td className="p-2 text-center">{trackLabels[t.track as keyof typeof trackLabels] || t.track}</td>
                        <td className="p-2 text-center">{t.course_hours}</td>
                        <td className="p-2 text-center">{t.nominees_count}</td>
                        <td className="p-2 text-center">{t.planned_start_date}</td>
                        <td className="p-2 text-center">{t.planned_end_date}</td>
                        <td className="p-2 text-center"><StatusBadge status={statusLabels[t.status as keyof typeof statusLabels] || t.status} variant={statusColors[t.status as keyof typeof statusColors] as any} /></td>
                        <td className="p-2 text-center"><StatusBadge status={complianceLabels[t.compliance as keyof typeof complianceLabels] || t.compliance} variant={complianceColors[t.compliance as keyof typeof complianceColors] as any} /></td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/courses?search=${encodeURIComponent(t.course_name)}`)}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTrainings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="entry" data-print-section="data_content">
          <div className="space-y-4">
            {has("import_training_plan") && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => excelRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4" />استيراد خطة تدريبية من Excel
                </Button>
                <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleImportExcel(e, "full_plan")} />

                <Button variant="outline" className="gap-1.5" onClick={() => govExcelRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4" />استيراد بيانات محافظة من Excel
                </Button>
                <input ref={govExcelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleImportExcel(e, "gov_only")} />
              </div>
            )}

            {has("add_governorate_training") && (
              <Button className="gap-1.5" onClick={openAddGov}>
                <Plus className="w-4 h-4" />إضافة بيانات محافظة
              </Button>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-right">المحافظة</th>
                    <th className="p-2 text-right">الدورة</th>
                    <th className="p-2 text-right">المجال</th>
                    <th className="p-2 text-center">المسار</th>
                    <th className="p-2 text-center">الساعات</th>
                    <th className="p-2 text-center">المرشحون</th>
                    <th className="p-2 text-center">تاريخ البدء</th>
                    <th className="p-2 text-center">تاريخ الانتهاء</th>
                    <th className="p-2 text-center">الحالة</th>
                    <th className="p-2 text-center">الالتزام</th>
                    {has("edit_governorate_training") && <th className="p-2 text-center">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {govTrainings.map(t => (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="p-2">{t.governorate}</td>
                      <td className="p-2">{t.course_name}</td>
                      <td className="p-2">{t.domain}</td>
                      <td className="p-2 text-center">{trackLabels[t.track as keyof typeof trackLabels] || t.track}</td>
                      <td className="p-2 text-center">{t.course_hours}</td>
                      <td className="p-2 text-center">{t.nominees_count}</td>
                      <td className="p-2 text-center">{t.planned_start_date}</td>
                      <td className="p-2 text-center">{t.planned_end_date}</td>
                      <td className="p-2 text-center"><StatusBadge status={statusLabels[t.status as keyof typeof statusLabels] || t.status} variant={statusColors[t.status as keyof typeof statusColors] as any} /></td>
                      <td className="p-2 text-center"><StatusBadge status={complianceLabels[t.compliance as keyof typeof complianceLabels] || t.compliance} variant={complianceColors[t.compliance as keyof typeof complianceColors] as any} /></td>
                      {has("edit_governorate_training") && (
                        <td className="p-2 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditGov(t)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteGov(t.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {govTrainings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-primary" />جدول الأسابيع
                </h3>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddWeek}>
                  <Plus className="w-3.5 h-3.5" />إضافة أسبوع
                </Button>
              </div>

              {Object.keys(weekSchedulesByGov).length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">لا توجد جداول أسابيع</p>
              )}

              {Object.entries(weekSchedulesByGov).map(([gov, weeks]) => (
                <div key={gov} className="mb-3">
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />{gov}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-1.5 text-right">الأسبوع</th>
                          <th className="p-1.5 text-center">تاريخ البدء</th>
                          <th className="p-1.5 text-center">تاريخ الانتهاء</th>
                          <th className="p-1.5 text-right">الوصف</th>
                          <th className="p-1.5 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeks.map(w => (
                          <tr key={w.id} className="border-b">
                            <td className="p-1.5">{w.week}</td>
                            <td className="p-1.5 text-center">{w.start_date}</td>
                            <td className="p-1.5 text-center">{w.end_date}</td>
                            <td className="p-1.5">{w.label}</td>
                            <td className="p-1.5 text-center">
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => openEditWeek(w)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => deleteWeek(w.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showGovForm} onOpenChange={setShowGovForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingGov ? "تعديل بيانات المحافظة" : "إضافة بيانات محافظة"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">المحافظة</Label>
              <Input value={govForm.governorate} onChange={e => setGovForm({ ...govForm, governorate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">اسم الدورة</Label>
              <Input value={govForm.course_name} onChange={e => setGovForm({ ...govForm, course_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">المجال</Label>
              <Input value={govForm.domain} onChange={e => setGovForm({ ...govForm, domain: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">الساعات</Label>
              <Input type="number" value={govForm.course_hours} onChange={e => setGovForm({ ...govForm, course_hours: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">المسار</Label>
              <Select value={govForm.track} onValueChange={v => setGovForm({ ...govForm, track: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="المسار الأول">المسار الأول / القاعة A</SelectItem>
                  <SelectItem value="المسار الثاني">المسار الثاني / القاعة B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">عدد المرشحين</Label>
              <Input type="number" value={govForm.nominees_count} onChange={e => setGovForm({ ...govForm, nominees_count: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ البدء المخطط</Label>
              <Input type="date" value={govForm.planned_start_date} onChange={e => setGovForm({ ...govForm, planned_start_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ الانتهاء المخطط</Label>
              <Input type="date" value={govForm.planned_end_date} onChange={e => setGovForm({ ...govForm, planned_end_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ البدء الفعلي</Label>
              <Input type="date" value={govForm.actual_start_date} onChange={e => setGovForm({ ...govForm, actual_start_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ الانتهاء الفعلي</Label>
              <Input type="date" value={govForm.actual_end_date} onChange={e => setGovForm({ ...govForm, actual_end_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">الحالة</Label>
              <Select value={govForm.status} onValueChange={v => setGovForm({ ...govForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">مخططة</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="delayed">متأخرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">الالتزام</Label>
              <Select value={govForm.compliance} onValueChange={v => setGovForm({ ...govForm, compliance: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">لم يبدأ</SelectItem>
                  <SelectItem value="on_track">ملتزم</SelectItem>
                  <SelectItem value="delayed">متأخر</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea value={govForm.notes} onChange={e => setGovForm({ ...govForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowGovForm(false)}>إلغاء</Button>
            <Button onClick={saveGov}>{editingGov ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeekForm} onOpenChange={setShowWeekForm}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingWeek ? "تعديل الأسبوع" : "إضافة أسبوع"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">المحافظة</Label>
              <Select value={weekForm.governorate} onValueChange={v => setWeekForm({ ...weekForm, governorate: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent>
                  {ALL_19_GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">رقم الأسبوع</Label>
              <Input type="number" value={weekForm.week} onChange={e => setWeekForm({ ...weekForm, week: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ البدء</Label>
              <Input type="date" value={weekForm.start_date} onChange={e => setWeekForm({ ...weekForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">تاريخ الانتهاء</Label>
              <Input type="date" value={weekForm.end_date} onChange={e => setWeekForm({ ...weekForm, end_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">الوصف</Label>
              <Input value={weekForm.label} onChange={e => setWeekForm({ ...weekForm, label: e.target.value })} placeholder="الأسبوع الأول" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowWeekForm(false)}>إلغاء</Button>
            <Button onClick={saveWeek}>{editingWeek ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
