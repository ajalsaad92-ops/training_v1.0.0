import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCourses, useCurriculumItems, useCorrespondence, useTasks, useHRRequests, useEmployees } from "@/hooks/useSupabaseData";
import {
  Palette, Star, BookOpen, Users, BarChart3, ClipboardList, Mail, CalendarPlus, ListChecks, ChevronLeft, Loader2,
} from "lucide-react";
import {
  getItemsWithEmptyFields, countByStage, countByPptStage,
  stageLabels, stageColors, pptStageLabels, pptStageColors,
  type CurriculumStage, type PptStage,
} from "@/lib/curriculumHelpers";

const StarRating = ({ rating, max = 7 }: { rating: number; max?: number }) => (
  <div className="flex gap-0.5 justify-center" dir="ltr">
    {Array.from({ length: max }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-warning text-warning" : "fill-muted text-muted"}`} />
    ))}
  </div>
);

const DesignCard = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) => (
  <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{title}</h3>
    {children}
  </div>
);

const Designs = () => {
  const { user } = useAuth();
  const { persona } = useUserRole();
  const { data: courses, loading: cl } = useCourses();
  const { data: curriculumItems } = useCurriculumItems();
  const { data: correspondence } = useCorrespondence();
  const { data: tasks } = useTasks();
  const { data: hrRequests } = useHRRequests();
  const { data: employees } = useEmployees();
  const navigate = useNavigate();
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const loading = cl;
  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalCourses = courses.length;
  const externalCourses = courses.filter(c => c.type === "external").length;
  const internalCourses = totalCourses - externalCourses;
  const totalTrainees = courses.reduce((sum, c) => sum + (c.trainees?.length || 0), 0);
  const completedCourses = courses.filter(c => c.status === "completed").length;
  const activeCourses = courses.filter(c => c.status === "active").length;
  const plannedCourses = courses.filter(c => c.status === "planned").length;
  const avgAchievement = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  const trainedStaffPercent = employees.length > 0 ? Math.min(Math.round((totalTrainees / employees.length) * 100), 100) : 0;

  const missingReports = curriculumItems.filter(c => c.status === "applied" && !c.report_uploaded);
  const pendingCorrespondence = correspondence.filter(c => c.status === "in_progress");
  const pendingHR = hrRequests.filter(r => r.approval_status === "pending").length;
  const unitApprovedHR = hrRequests.filter(r => r.approval_status === "unit_approved").length;

  const currStageCounts = countByStage(curriculumItems);
  const pptStageCounts = countByPptStage(curriculumItems);

  const ratingItems = [
    { label: "التدريب", rating: 6 },
    { label: "المدربين", rating: 6 },
    { label: "المشرفين", rating: 5 },
    { label: "المتدربين", rating: 5 },
  ];

  const alertItems = [
    { label: "كتب غير منجزة", count: missingReports.length, color: "bg-destructive" },
    { label: "مراسلات واردة", count: pendingCorrespondence.length, color: "bg-accent" },
    { label: "طلبات معلقة", count: pendingHR + unitApprovedHR, color: "bg-warning" },
    { label: "مهام الإعداد", count: tasks.filter(t => t.unit === "الإعداد" && t.status !== "completed").length, color: "bg-primary" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2"><Palette className="w-7 h-7 text-primary" />معرض التصاميم</h1>
          <p className="page-subtitle">نماذج لوحات القيادة المتاحة - اضغط للتبديل</p>
        </div>
      </div>

      {/* Design 1: Classic Manager Dashboard */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedDesign(selectedDesign === "classic" ? null : "classic")}>
          <div className={`w-4 h-4 rounded-full border-2 ${selectedDesign === "classic" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
          <h2 className="text-sm font-bold text-foreground">التصميم الكلاسيكي (3 أعمدة + تقييمات + تنبيهات)</h2>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">مدير / مدير قسم</span>
        </div>

        {selectedDesign === "classic" && (
          <div className="border-2 border-primary/30 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3 space-y-1.5">
                {alertItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
                    <div className={`w-7 h-7 rounded-full ${item.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>{item.count}</div>
                    <span className="text-xs font-medium text-foreground flex-1">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">عدد الدورات</p>
                    <p className="text-3xl font-bold text-primary">{totalCourses}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">خارجية: {externalCourses} / داخلية: {internalCourses}</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">الكوادر المدربة</p>
                    <p className="text-3xl font-bold text-primary">{totalTrainees}</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">نسبة الكوادر</p>
                    <p className="text-3xl font-bold text-primary">{trainedStaffPercent}%</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">نسبة الإنجاز</p>
                    <p className="text-3xl font-bold text-accent">{avgAchievement}%</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 space-y-1.5">
                {ratingItems.map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-2.5 text-center">
                    <p className="text-xs font-semibold text-foreground mb-1">{item.label}</p>
                    <StarRating rating={item.rating} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Design 2: Curriculum Stages */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedDesign(selectedDesign === "stages" ? null : "stages")}>
          <div className={`w-4 h-4 rounded-full border-2 ${selectedDesign === "stages" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
          <h2 className="text-sm font-bold text-foreground">تصميم مراحل المناهج والعروض</h2>
          <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded">رئيس شعبة المناهج</span>
        </div>

        {selectedDesign === "stages" && (
          <div className="border-2 border-accent/30 rounded-xl p-4 space-y-3">
            <DesignCard title="المناهج حسب المراحل" icon={BookOpen}>
              <div className="grid grid-cols-4 gap-2">
                {(["form", "auditing", "printing", "done"] as CurriculumStage[]).map(s => (
                  <div key={s} className={`rounded-lg p-2 text-center ${stageColors[s]}`}>
                    <p className="text-lg font-bold">{currStageCounts[s]}</p>
                    <p className="text-[10px]">{stageLabels[s]}</p>
                  </div>
                ))}
              </div>
              {curriculumItems.length > 0 && (
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden flex">
                  {(["form", "auditing", "printing", "done"] as CurriculumStage[]).map(s => {
                    const pct = (currStageCounts[s] / curriculumItems.length) * 100;
                    const barColors: Record<CurriculumStage, string> = { form: "bg-muted-foreground/40", auditing: "bg-warning", printing: "bg-accent", done: "bg-success" };
                    return pct > 0 ? <div key={s} className={`${barColors[s]} h-full`} style={{ width: `${pct}%` }} /> : null;
                  })}
                </div>
              )}
            </DesignCard>
            <DesignCard title="العروض حسب المراحل" icon={ClipboardList}>
              <div className="grid grid-cols-3 gap-2">
                {(["new_ppt", "ppt_done", "pdf"] as PptStage[]).map(s => (
                  <div key={s} className={`rounded-lg p-2 text-center ${pptStageColors[s]}`}>
                    <p className="text-lg font-bold">{pptStageCounts[s]}</p>
                    <p className="text-[10px]">{pptStageLabels[s]}</p>
                  </div>
                ))}
              </div>
            </DesignCard>
          </div>
        )}
      </div>

      {/* Design 3: Individual Dashboard */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedDesign(selectedDesign === "individual" ? null : "individual")}>
          <div className={`w-4 h-4 rounded-full border-2 ${selectedDesign === "individual" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
          <h2 className="text-sm font-bold text-foreground">تصميم اللوحة الشخصية</h2>
          <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded">مستخدم عادي</span>
        </div>

        {selectedDesign === "individual" && (
          <div className="border-2 border-success/30 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">إجازات الشهر</p>
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-[10px] text-muted-foreground">المتبقي: 3</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">غيابات</p>
                <p className="text-2xl font-bold text-destructive">0</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">خروجيات</p>
                <p className="text-2xl font-bold text-warning">0</p>
                <p className="text-[10px] text-muted-foreground">المتبقي: 7 ساعة</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" />مهامي المسندة</h3>
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد مهام نشطة</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-card border border-border rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">مهامي</p><p className="text-xl font-bold text-primary">0</p></div>
              <div className="bg-card border border-border rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">مكتملة</p><p className="text-xl font-bold text-success">0</p></div>
              <div className="bg-card border border-border rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">قيد التنفيذ</p><p className="text-xl font-bold text-warning">0</p></div>
              <div className="bg-card border border-border rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">معلّقة</p><p className="text-xl font-bold text-muted-foreground">0</p></div>
              <div className="bg-card border border-border rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">نقاط الإنجاز</p><p className="text-xl font-bold text-accent">0</p></div>
            </div>
          </div>
        )}
      </div>

      {/* Design 4: Notifications & Alerts */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedDesign(selectedDesign === "notifications" ? null : "notifications")}>
          <div className={`w-4 h-4 rounded-full border-2 ${selectedDesign === "notifications" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
          <h2 className="text-sm font-bold text-foreground">تصميم الإشعارات والتنبيهات</h2>
          <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded">جميع الأدوار</span>
        </div>

        {selectedDesign === "notifications" && (
          <div className="border-2 border-warning/30 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-warning" />إشعارات الموافقات ({pendingHR + unitApprovedHR})</h3>
                <div className="space-y-2">
                  {hrRequests.filter(r => ["pending", "unit_approved"].includes(r.approval_status)).slice(0, 4).map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-warning/5 rounded-lg px-3 py-2">
                      <div className="flex-1"><span className="text-sm font-medium">{r.employee_name}</span><span className="text-xs text-muted-foreground mr-2">— {r.type}</span></div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.approval_status === "unit_approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {r.approval_status === "unit_approved" ? "✓ رئيس الشعبة" : "معلّق"}
                      </span>
                    </div>
                  ))}
                  {hrRequests.filter(r => ["pending", "unit_approved"].includes(r.approval_status)).length === 0 && <p className="text-sm text-muted-foreground text-center">لا توجد إشعارات</p>}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Mail className="w-4 h-4 text-accent" />إشعارات المراسلات ({pendingCorrespondence.length})</h3>
                <div className="space-y-2">
                  {pendingCorrespondence.slice(0, 4).map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-accent/5 rounded-lg px-3 py-2">
                      <span className="text-sm">{c.subject}</span>
                      <span className="text-[10px] text-muted-foreground">{c.date}</span>
                    </div>
                  ))}
                  {pendingCorrespondence.length === 0 && <p className="text-sm text-muted-foreground text-center">لا توجد مراسلات معلقة</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Designs;
