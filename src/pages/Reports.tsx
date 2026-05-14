import { useState, useRef } from "react";
import { useCourses, useEmployees, useCorrespondence } from "@/hooks/useSupabaseData";
import { sanitizeExcelRow } from "@/lib/validation";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Clock, Award, Archive, Users, Download, FileSpreadsheet, Table, Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

type QueryType = "waiting" | "achievements" | "archive" | "staff" | null;
type ReportRow = { name: string; department: string; type: string; status: string; date: string; trainer: string };

const Reports = () => {
  const { data: courses, loading: cl } = useCourses();
  const { data: employees, loading: el } = useEmployees();
  const { data: correspondenceItems, loading: col } = useCorrespondence();
  const [activeQuery, setActiveQuery] = useState<QueryType>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["name", "type", "status"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [importedRows, setImportedRows] = useState<ReportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = cl || el || col;

  const queries = [
    { key: "waiting" as const, label: "قائمة الانتظار", icon: Clock, color: "bg-warning/10 text-warning" },
    { key: "achievements" as const, label: "الإنجازات", icon: Award, color: "bg-success/10 text-success" },
    { key: "archive" as const, label: "الأرشيف", icon: Archive, color: "bg-primary/10 text-primary" },
    { key: "staff" as const, label: "الموظفون", icon: Users, color: "bg-accent/10 text-accent" },
  ];

  const columnOptions = [
    { key: "name", label: "الاسم" }, { key: "department", label: "القسم" }, { key: "type", label: "النوع" },
    { key: "status", label: "الحالة" }, { key: "date", label: "التاريخ" }, { key: "trainer", label: "المدرب" },
  ];

  const getQueryData = () => {
    if (importedRows.length > 0) return importedRows;
    switch (activeQuery) {
      case "waiting":
        return courses.flatMap((c) => (c.trainees || []).filter((t) => t.status === "waiting").map((t) => ({
          name: t.name, department: "—", type: c.title, status: "قيد الانتظار", date: c.start_date || "—", trainer: c.trainer,
        })));
      case "achievements":
        return courses.filter((c) => c.status === "completed").map((c) => ({
          name: c.title, department: "—", type: c.type === "internal" ? "داخلي" : "خارجي", status: "منتهية", date: c.end_date || "—", trainer: c.trainer,
        }));
      case "archive":
        return correspondenceItems.filter((c) => c.status === "archived").map((c) => ({
          name: c.subject, department: c.from, type: c.type.includes("incoming") ? "وارد" : "صادر", status: "محفوظ", date: c.date, trainer: "—",
        }));
      case "staff":
        return employees.map((e) => ({ name: e.name, department: e.department, type: e.position, status: "نشط", date: "—", trainer: "—" }));
      default:
        return [];
    }
  };

  const data = getQueryData();
  const toggleColumn = (col: string) => setSelectedColumns((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]);

  const handleExportPDF = () => {
    if (data.length === 0) { toast({ title: "تنبيه", description: "لا توجد بيانات للتصدير", variant: "destructive" }); return; }
    const doc = new jsPDF();
    const cols = columnOptions.filter((c) => selectedColumns.includes(c.key));
    const headers = cols.map((c) => c.label);
    const rows = data.map((row: ReportRow) => cols.map((c) => row[c.key as keyof ReportRow] || "—"));
    const pdfDoc = doc as jsPDF & { autoTable: (options: Record<string, unknown>) => void };
    pdfDoc.autoTable({ head: [headers], body: rows, styles: { font: "helvetica", fontSize: 10 }, headStyles: { fillColor: [41, 98, 255] } });
    doc.save("report.pdf");
    toast({ title: "تم", description: `تم تصدير ${data.length} سجل بصيغة PDF` });
  };

  const handleExportExcel = () => {
    if (data.length === 0) { toast({ title: "تنبيه", description: "لا توجد بيانات للتصدير", variant: "destructive" }); return; }
    const cols = columnOptions.filter((c) => selectedColumns.includes(c.key));
    const wsData = [cols.map((c) => c.label), ...data.map((row: ReportRow) => cols.map((c) => row[c.key as keyof ReportRow] || "—"))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير");
    XLSX.writeFile(wb, "report.xlsx");
    toast({ title: "تم", description: `تم تصدير ${data.length} سجل بصيغة Excel` });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const mapped = jsonData.map((row: Record<string, unknown>) => {
        const s = sanitizeExcelRow(row);
        return {
          name: (s["الاسم"] || s["name"] || Object.values(s)[0] || "—").slice(0, 200),
          department: (s["القسم"] || s["department"] || "—").slice(0, 100),
          type: (s["النوع"] || s["type"] || "—").slice(0, 100),
          status: (s["الحالة"] || s["status"] || "—").slice(0, 50),
          date: (s["التاريخ"] || s["date"] || "—").slice(0, 20),
          trainer: (s["المدرب"] || s["trainer"] || "—").slice(0, 100),
        };
      });
      setImportedRows(mapped);
      setActiveQuery(null);
      toast({ title: "تم", description: `تم استيراد ${mapped.length} سجل من الملف` });
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="no-print">
        <h1 className="page-header flex items-center gap-2"><BarChart3 className="w-7 h-7 text-primary" />التقارير والاستعلامات</h1>
        <p className="page-subtitle">استعلام ذكي وإنشاء تقارير مخصصة</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        {queries.map((q) => (
          <button key={q.key} onClick={() => { setActiveQuery(activeQuery === q.key ? null : q.key); setImportedRows([]); }} className={`p-4 rounded-xl border transition-all text-right ${activeQuery === q.key ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/30"}`}>
            <div className={`w-10 h-10 rounded-lg ${q.color} flex items-center justify-center mb-2`}><q.icon className="w-5 h-5" /></div>
            <p className="font-semibold text-foreground text-sm">{q.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-5 no-print">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Table className="w-4 h-4 text-primary" />منشئ التقارير المخصص</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[250px]">
            <p className="text-sm text-muted-foreground mb-2">اختر الأعمدة:</p>
            <div className="flex flex-wrap gap-2">
              {columnOptions.map((col) => (
                <button key={col.key} onClick={() => toggleColumn(col.key)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selectedColumns.includes(col.key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{col.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div><p className="text-xs text-muted-foreground mb-1">من</p><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" /></div>
            <div><p className="text-xs text-muted-foreground mb-1">إلى</p><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" /></div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}><Download className="w-4 h-4" />تصدير PDF</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" />تصدير Excel</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" />استيراد Excel</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
          {importedRows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setImportedRows([])}>مسح المستورد</Button>
          )}
        </div>
      </div>

      {(activeQuery || importedRows.length > 0) && (
        <div className="bg-card rounded-xl border border-border overflow-hidden print-content">
          <div className="p-4 border-b border-border"><p className="font-semibold text-foreground">النتائج ({data.length} سجل)</p></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>{columnOptions.filter((c) => selectedColumns.includes(c.key)).map((col) => <th key={col.key}>{col.label}</th>)}</tr></thead>
              <tbody>
                {data.length > 0 ? data.map((row: ReportRow, i: number) => (
                  <tr key={i}>{selectedColumns.map((col) => (
                    <td key={col}>{col === "status" ? <StatusBadge status={row[col as keyof ReportRow]} /> : <span className={col === "name" ? "font-medium text-foreground" : "text-muted-foreground"}>{row[col as keyof ReportRow]}</span>}</td>
                  ))}</tr>
                )) : (
                  <tr><td colSpan={selectedColumns.length} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
