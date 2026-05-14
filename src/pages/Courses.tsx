import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCourses, useEmployees, type Course } from "@/hooks/useSupabaseData";
import { localDb } from "@/lib/localStore";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { logAction } from "@/lib/auditLog";
import { courseSchema } from "@/lib/validation";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, MapPin, Calendar, User, Eye, DollarSign, Award, QrCode, Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const courseStatusLabels: Record<string, string> = { active: "نشطة", completed: "منتهية", planned: "مخططة" };

const emptyCourse = { title: "", code: "", type: "internal", training_type: "developmental", venue: "", start_date: "", end_date: "", trainer: "", supervisor: "", sponsor: "", status: "planned", estimated_budget: 0, actual_cost: 0 };

const Courses = () => {
  const { user } = useAuth();
  const { has } = useUserRole();
  const { data: courses, loading, refetch } = useCourses();
  const { data: employees } = useEmployees();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificate, setShowCertificate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyCourse);
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId) {
      const found = courses.find(c => c.id === focusId);
      if (found) {
        setSelectedCourse(found);
        searchParams.delete("focus");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [courses, searchParams, setSearchParams]);

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.includes(search) || c.code.includes(search);
    const matchType = filterType === "all" || c.status === filterType;
    return matchSearch && matchType;
  });

  const openCreate = () => { setEditingCourse(null); setForm(emptyCourse); setShowForm(true); };
  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({ title: course.title, code: course.code, type: course.type, training_type: course.training_type, venue: course.venue, start_date: course.start_date || "", end_date: course.end_date || "", trainer: course.trainer, supervisor: course.supervisor, sponsor: course.sponsor, status: course.status, estimated_budget: course.estimated_budget, actual_cost: course.actual_cost });
    setShowForm(true);
  };

  const handleSave = async () => {
    const result = courseSchema.safeParse(form);
    if (!result.success) {
      toast({ title: "خطأ", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    const validated = result.data;
    setSaving(true);
    try {
      if (editingCourse) {
        localDb.courses.update(editingCourse.id, validated);
        await logAction(user?.name || "مستخدم", "تعديل دورة", validated.title);
        toast({ title: "تم", description: "تم تحديث الدورة" });
      } else {
        localDb.courses.insert(validated);
        await logAction(user?.name || "مستخدم", "إضافة دورة", validated.title);
        toast({ title: "تم", description: "تم إنشاء الدورة بنجاح" });
      }
      setShowForm(false);
      setForm(emptyCourse);
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error saving course:", err);
      toast({ title: "خطأ", description: message || "حدث خطأ أثناء الحفظ", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    localDb.courses.delete(id);
    await logAction(user?.name || "مستخدم", "حذف دورة", title);
    toast({ title: "تم", description: "تم حذف الدورة" });
    refetch();
  };

  const handleTraineeStatusChange = async (traineeId: string, traineeName: string, newStatus: string) => {
    localDb.trainees.update(traineeId, { status: newStatus });
    await logAction(user?.name || "مستخدم", "تحديث حالة متدرب", traineeName);
    toast({ title: "تم", description: "تم تحديث حالة المتدرب" });
    if (selectedCourse) {
      setSelectedCourse({
        ...selectedCourse,
        trainees: (selectedCourse.trainees || []).map((t) => t.id === traineeId ? { ...t, status: newStatus } : t),
      });
    }
    refetch();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="التنفيذ التدريبي" subtitle="إدارة الدورات التدريبية والمتدربين" icon={GraduationCap} sections={[
        { id: "search_filter", label: "البحث والفلترة" },
        { id: "courses_list", label: "قائمة الدورات" },
      ]} exportData={() => ({
        filename: "courses",
        rows: filtered.map(c => ({ العنوان: c.title, الكود: c.code, النوع: c.type === "internal" ? "داخلي" : "خارجي", الحالة: courseStatusLabels[c.status] || c.status, البداية: c.start_date, النهاية: c.end_date, المدرب: c.trainer || "", الميزانية: c.estimated_budget, التكلفة: c.actual_cost }))
      })} />
      <div className="flex items-center justify-end flex-wrap gap-4 no-print">
        {has("add_course") && <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />دورة جديدة</Button>}
      </div>

      <div className="flex flex-wrap gap-3 items-center no-print">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="ps-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["all", "active", "planned", "completed"].map((s) => (
            <button key={s} onClick={() => setFilterType(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterType === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s === "all" ? "الكل" : courseStatusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div data-print-section="courses_list" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 print-content">
        {filtered.length > 0 ? filtered.map((course) => (
          <div key={course.id} className="bg-card rounded-xl border border-border p-4 md:p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1"><h3 className="font-bold text-foreground truncate">{course.title}</h3><p className="text-xs text-muted-foreground mt-0.5">{course.code}</p></div>
              <StatusBadge status={courseStatusLabels[course.status] || course.status} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{course.venue}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span>{course.start_date} إلى {course.end_date}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">المدرب: {course.trainer}</span></div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{(course.trainees || []).length} متدرب</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{course.type === "internal" ? "داخلي" : "خارجي"}</span>
              </div>
              <div className="flex gap-1 no-print">
                <Button variant="ghost" size="sm" className="gap-1 text-primary h-8 px-2" onClick={() => setSelectedCourse(course)}><Eye className="w-3.5 h-3.5" /></Button>
                {has("edit_course") && <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-8 px-2" onClick={() => openEdit(course)}><Pencil className="w-3.5 h-3.5" /></Button>}
                {has("delete_course") && <Button variant="ghost" size="sm" className="gap-1 text-destructive h-8 px-2" onClick={() => handleDelete(course.id, course.title)}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">لا توجد دورات</div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCourse ? "تعديل الدورة" : "دورة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>الرمز</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>المكان</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
              <div><Label>الجهة الراعية</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} /></div>
              <div><Label>تاريخ البدء</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div><Label>المدرب</Label><Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div>
              <div><Label>المشرف</Label><Input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} /></div>
              <div><Label>الميزانية التقديرية</Label><Input type="number" value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: Number(e.target.value) })} /></div>
              <div><Label>التكلفة الفعلية</Label><Input type="number" value={form.actual_cost} onChange={(e) => setForm({ ...form, actual_cost: Number(e.target.value) })} /></div>
              <div>
                <Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="internal">داخلي</SelectItem><SelectItem value="external">خارجي</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planned">مخططة</SelectItem><SelectItem value="active">نشطة</SelectItem><SelectItem value="completed">منتهية</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCourse ? "تحديث" : "إنشاء"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />{selectedCourse?.title}</DialogTitle></DialogHeader>
          {selectedCourse && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["الرمز", selectedCourse.code],
                  ["النوع", `${selectedCourse.type === "internal" ? "داخلي" : "خارجي"} - ${selectedCourse.training_type === "developmental" ? "تطويري" : "تخصصي"}`],
                  ["المكان", selectedCourse.venue],
                  ["التاريخ", `${selectedCourse.start_date} - ${selectedCourse.end_date}`],
                  ["المدرب", selectedCourse.trainer],
                  ["المشرف", selectedCourse.supervisor],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3"><p className="text-muted-foreground text-xs">{label}</p><p className="font-semibold text-foreground text-sm">{value}</p></div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-accent" />البيانات المالية</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">الميزانية</p><p className="text-lg font-bold text-foreground">{selectedCourse.estimated_budget.toLocaleString()} ر.س</p></div>
                  <div><p className="text-muted-foreground">الفعلية</p><p className="text-lg font-bold text-foreground">{selectedCourse.actual_cost.toLocaleString()} ر.س</p></div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" />المتدربون ({(selectedCourse.trainees || []).length})</h4>
                {(selectedCourse.trainees || []).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedCourse.trainees || []).map((trainee) => (
                      <div key={trainee.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border border-border">
                        <p className="font-medium text-foreground text-sm">{trainee.name}</p>
                        <div className="flex items-center gap-2">
                          {has("update_trainee_status") ? (
                            <Select value={trainee.status} onValueChange={(v) => handleTraineeStatusChange(trainee.id, trainee.name, v)}>
                              <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passed">اجتاز</SelectItem>
                                <SelectItem value="failed">لم يجتز</SelectItem>
                                <SelectItem value="waiting">قيد الانتظار</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={trainee.status === "passed" ? "اجتاز" : trainee.status === "failed" ? "لم يجتز" : "قيد الانتظار"} />
                          )}
                          {trainee.status === "passed" && (
                            <button onClick={() => setShowCertificate(trainee.name)} className="p-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"><Award className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">لم يتم إضافة متدربين بعد</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showCertificate} onOpenChange={() => setShowCertificate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>معاينة الشهادة</DialogTitle></DialogHeader>
          <div className="border-2 border-primary/20 rounded-xl p-8 text-center space-y-4 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Award className="w-8 h-8 text-primary" /></div>
            <h3 className="text-xl font-bold text-foreground">شهادة إتمام تدريب</h3>
            <p className="text-muted-foreground">يُشهد بأن</p>
            <p className="text-2xl font-bold text-primary">{showCertificate}</p>
            <p className="text-muted-foreground">قد أتم بنجاح دورة</p>
            <p className="text-lg font-bold text-foreground">{selectedCourse?.title}</p>
            <div className="pt-4 flex justify-center"><div className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center"><QrCode className="w-12 h-12 text-muted-foreground/40" /></div></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Courses;
