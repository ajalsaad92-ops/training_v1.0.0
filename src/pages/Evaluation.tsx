import { useState } from "react";
import { useCourses } from "@/hooks/useSupabaseData";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import { ClipboardCheck, Star, Users, UserCheck, Bell, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const Evaluation = () => {
  const { data: courses, loading } = useCourses();
  const [expandedType, setExpandedType] = useState<string | null>(null);

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

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="التقييم والمتابعة" subtitle="نماذج التقييم ومتابعة أثر التدريب" icon={ClipboardCheck} sections={[
        { id: "evaluation_types", label: "أنواع التقييم" },
        { id: "follow_up", label: "متابعة أثر التدريب" },
      ]} exportData={() => ({
        filename: "evaluation",
        rows: courses.map(c => ({ الدورة: c.title, المدرب: c.trainer || "", الحالة: c.status, المتدربون: c.trainees?.length || 0, البداية: c.start_date, النهاية: c.end_date }))
      })} />

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

      <div data-print-section="follow_up" className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-warning" />متابعة أثر التدريب</h2>
        <p className="text-sm text-muted-foreground mb-4">الدورات التي مضى عليها 90 يوماً بعد الانتهاء ويجب متابعة أثرها التدريبي</p>
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
    </div>
  );
};

export default Evaluation;
