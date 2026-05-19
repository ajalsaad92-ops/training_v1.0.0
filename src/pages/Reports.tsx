import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  REPORT_SOURCES,
  SOURCE_LIST,
  runReport,
  formatRow,
  computeExecutiveKPIs,
  type ReportSourceKey,
} from "@/lib/reportEngine";
import { printReport, downloadHtml, type PrintTemplate } from "@/lib/printReport";
import { scheduleStore, type ScheduleFrequency, type ScheduledReport } from "@/lib/scheduledReports";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Printer, Download, FileSpreadsheet, FileText, Calendar, Clock,
  Trash2, Plus, Search, Sparkles, Layers,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

const Reports = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [source, setSource] = useState<ReportSourceKey>("courses");
  const [columns, setColumns] = useState<string[]>(REPORT_SOURCES.courses.defaultColumns);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState<PrintTemplate>("official");
  const [schedules, setSchedules] = useState<ScheduledReport[]>(scheduleStore.getAll());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedName, setSchedName] = useState("");
  const [schedFreq, setSchedFreq] = useState<ScheduleFrequency>("weekly");
  const refreshRef = useRef(0);

  // when source changes, set defaults
  useEffect(() => { setColumns(REPORT_SOURCES[source].defaultColumns); }, [source]);

  // open from notification (?run=sch-id)
  useEffect(() => {
    const runId = params.get("run");
    if (runId) {
      const item = scheduleStore.getAll().find((s) => s.id === runId);
      if (item) {
        setSource(item.source);
        setColumns(item.columns);
        setTemplate(item.template);
        toast({ title: "تم تحميل تقرير مجدوّل", description: item.name });
      }
    }
  }, [params]);

  const { source: src, rows } = useMemo(
    () => runReport({ source, columns, dateFrom, dateTo, search }),
    [source, columns, dateFrom, dateTo, search, refreshRef.current]
  );

  const exec = useMemo(() => computeExecutiveKPIs(), []);

  const toggleCol = (k: string) =>
    setColumns((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const reportTitle = `تقرير ${src.label}`;

  const handlePrint = () => {
    if (rows.length === 0) return toast({ title: "لا توجد بيانات للطباعة", variant: "destructive" });
    printReport({
      template, title: reportTitle, source: src, rows, columns, dateFrom, dateTo,
      preparedBy: user?.name || "—",
    });
  };

  const handleExportExcel = () => {
    if (rows.length === 0) return toast({ title: "لا توجد بيانات", variant: "destructive" });
    const cols = columns.map((k) => src.columns.find((c) => c.key === k)!).filter(Boolean);
    const data = [cols.map((c) => c.label), ...rows.map((r) => formatRow(src, r, columns))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, src.label.slice(0, 28));
    XLSX.writeFile(wb, `${reportTitle}.xlsx`);
    toast({ title: "تم التصدير", description: `${rows.length} سجل` });
  };

  const handleExportPDF = () => {
    if (rows.length === 0) return toast({ title: "لا توجد بيانات", variant: "destructive" });
    const doc = new jsPDF({ orientation: "landscape" });
    const cols = columns.map((k) => src.columns.find((c) => c.key === k)!).filter(Boolean);
    const headers = cols.map((c) => c.label);
    const body = rows.map((r) => formatRow(src, r, columns));
    (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      head: [headers], body, styles: { font: "helvetica", fontSize: 9, halign: "right" },
      headStyles: { fillColor: template === "executive" ? [15, 23, 42] : [10, 77, 140] },
    });
    doc.save(`${reportTitle}.pdf`);
  };

  const handleAddSchedule = () => {
    if (!schedName.trim()) return toast({ title: "أدخل اسماً للجدولة", variant: "destructive" });
    const item = scheduleStore.add({
      name: schedName.trim(), source, columns, template, frequency: schedFreq, enabled: true,
    });
    setSchedules(scheduleStore.getAll());
    setSchedName("");
    setScheduleOpen(false);
    toast({ title: "تمت الجدولة", description: `${item.name} — ${schedFreq}` });
  };

  const removeSchedule = (id: string) => {
    scheduleStore.remove(id);
    setSchedules(scheduleStore.getAll());
  };

  const toggleSchedule = (id: string, enabled: boolean) => {
    scheduleStore.update(id, { enabled });
    setSchedules(scheduleStore.getAll());
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="no-print">
        <h1 className="page-header flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          مركز التقارير الذكي
        </h1>
        <p className="page-subtitle">نظام شامل لتوليد التقارير عن كل ما يحدث في النظام مع طباعة احترافية وجدولة تلقائية</p>
      </div>

      <Tabs defaultValue="builder" className="no-print">
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="builder" className="gap-2"><Layers className="w-4 h-4" />منشئ التقارير</TabsTrigger>
          <TabsTrigger value="executive" className="gap-2"><Sparkles className="w-4 h-4" />لوحة تنفيذية</TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2"><Calendar className="w-4 h-4" />الجدولة التلقائية</TabsTrigger>
        </TabsList>

        {/* ─────── Builder ─────── */}
        <TabsContent value="builder" className="space-y-4 mt-4">
          {/* Source picker */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-3 text-foreground">١. اختر مصدر البيانات</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {SOURCE_LIST.map((s) => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={`p-3 rounded-lg border text-right transition-all ${source === s.key ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                  <div className="font-semibold text-sm text-foreground">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters & columns */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">٢. اختر الأعمدة المطلوبة ({columns.length}/{src.columns.length})</p>
              <div className="flex flex-wrap gap-2">
                {src.columns.map((c) => (
                  <button key={c.key} onClick={() => toggleCol(c.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${columns.includes(c.key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {c.label}
                  </button>
                ))}
                <button onClick={() => setColumns(src.columns.map((c) => c.key))} className="px-3 py-1 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground">الكل</button>
                <button onClick={() => setColumns(src.defaultColumns)} className="px-3 py-1 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground">افتراضي</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">بحث في النتائج</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="كلمة مفتاحية..." className="pr-9" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">قالب الطباعة:</span>
              <div className="flex gap-1">
                <button onClick={() => setTemplate("official")} className={`px-3 py-1 rounded text-xs font-medium ${template === "official" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>رسمي</button>
                <button onClick={() => setTemplate("executive")} className={`px-3 py-1 rounded text-xs font-medium ${template === "executive" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>تنفيذي</button>
              </div>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-2"><FileText className="w-4 h-4" />PDF</Button>
              <Button size="sm" variant="outline" onClick={() => downloadHtml({ template, title: reportTitle, source: src, rows, columns, dateFrom, dateTo, preparedBy: user?.name || "—" })} className="gap-2"><Download className="w-4 h-4" />HTML</Button>
              <Button size="sm" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />طباعة</Button>
              <Button size="sm" variant="secondary" onClick={() => setScheduleOpen(true)} className="gap-2"><Clock className="w-4 h-4" />جدولة</Button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <span className="font-semibold text-sm">المعاينة — {src.label} ({rows.length} سجل)</span>
              <Button size="sm" variant="ghost" onClick={() => { refreshRef.current++; setSchedules(scheduleStore.getAll()); }}>تحديث</Button>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    {columns.map((k) => {
                      const c = src.columns.find((x) => x.key === k);
                      return <th key={k}>{c?.label || k}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">لا توجد نتائج مطابقة</td></tr>
                  ) : (
                    rows.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td className="text-muted-foreground">{i + 1}</td>
                        {formatRow(src, r, columns).map((v, j) => <td key={j}>{v}</td>)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {rows.length > 100 && (
                <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">عرض أول 100 سجل من أصل {rows.length} — التصدير يشمل الكل</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─────── Executive Dashboard ─────── */}
        <TabsContent value="executive" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {exec.kpis.map((k, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-bold text-foreground mt-1">{k.value}</div>
                {k.hint && <div className="text-[11px] text-primary mt-1">{k.hint}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="حالات الدورات" data={exec.courseStatus} type="pie" />
            <ChartCard title="حالات المهام" data={exec.taskStatus} type="bar" />
            <ChartCard title="الموظفون حسب القسم" data={exec.byDept} type="bar" />
            <ChartCard title="طلبات HR" data={exec.hrStatus} type="pie" />
            <ChartCard title="التزام المحافظات" data={exec.govCompliance} type="bar" />
          </div>
        </TabsContent>

        {/* ─────── Scheduled ─────── */}
        <TabsContent value="scheduled" className="space-y-3 mt-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">التقارير المجدوّلة</p>
                <p className="text-xs text-muted-foreground">يتم إنشاء إشعار داخل التطبيق عند حلول موعد كل تقرير</p>
              </div>
              <Button size="sm" onClick={() => setScheduleOpen(true)} className="gap-2"><Plus className="w-4 h-4" />جدولة جديدة</Button>
            </div>
            {schedules.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد جدولة بعد</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div>
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {REPORT_SOURCES[s.source].label} • {{ daily: "يومي", weekly: "أسبوعي", monthly: "شهري" }[s.frequency]} • {s.template === "official" ? "رسمي" : "تنفيذي"}
                        {s.lastRunAt ? ` • آخر تشغيل: ${new Date(s.lastRunAt).toLocaleString("ar-SA")}` : " • لم يُشغّل بعد"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={s.enabled ? "outline" : "secondary"} onClick={() => toggleSchedule(s.id, !s.enabled)}>
                        {s.enabled ? "نشطة" : "متوقفة"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSchedule(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>جدولة تقرير تلقائي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">اسم التقرير</label>
              <Input value={schedName} onChange={(e) => setSchedName(e.target.value)} placeholder="مثال: تقرير الدورات الأسبوعي" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">التكرار</label>
              <Select value={schedFreq} onValueChange={(v) => setSchedFreq(v as ScheduleFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
              سيتم استخدام المصدر «{src.label}»، الأعمدة المختارة ({columns.length})، والقالب «{template === "official" ? "الرسمي" : "التنفيذي"}»
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddSchedule}>حفظ الجدولة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ChartCard = ({ title, data, type }: { title: string; data: { name: string; value: number }[]; type: "bar" | "pie" }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <p className="font-semibold text-sm mb-3">{title}</p>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 11 }}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  </div>
);

export default Reports;
