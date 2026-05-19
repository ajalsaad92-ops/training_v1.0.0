import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, CalendarDays, BookOpen, Users, User, BarChart3, Pencil } from "lucide-react";
import {
  weeklyPlanData, coursesHoursData, participantsByCourseData,
  coursesPerParticipantData, summaryData, topCoursesData,
  correctionsData, totalHoursAfterCorrection, totalWeeks,
  type WeeklyPlanRow, type CourseHoursRow, type ParticipantByCourseRow,
  type CoursesPerParticipantRow, type CorrectionRow,
} from "@/data/trainingPlanData";

const statusColors: Record<string, string> = {
  "تنفيذ كامل": "success",
  "بدء الدورة": "warning",
  "استمرار": "info",
  "اختتام الدورة": "neutral",
};

const trackLabels: Record<string, string> = {
  "المسار الأول": "المسار الأول / القاعة A",
  "المسار الثاني": "المسار الثاني / القاعة B",
};

const WeeklyPlanTab = () => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    weeklyPlanData.filter(r =>
      r.track1_name.includes(search) || r.track2_name.includes(search) || String(r.week).includes(search)
    ), [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الخطة الأسبوعية..." className="ps-9" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">الأسبوع</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">المسار الأول / القاعة A</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">ساعات</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">أيام</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">حالة</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">المسار الثاني / القاعة B</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">ساعات</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">أيام</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">حالة</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((r) => (
              <tr key={r.week} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-bold text-primary">{r.week}</td>
                <td className="px-3 py-2 font-medium text-foreground">{r.track1_name || "—"}</td>
                <td className="px-3 py-2 text-center">{r.track1_hours ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.track1_days ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.track1_status ? <StatusBadge status={r.track1_status} variant={statusColors[r.track1_status] as "success" | "warning" | "info" | "neutral"} /> : "—"}</td>
                <td className="px-3 py-2 font-medium text-foreground">{r.track2_name || "—"}</td>
                <td className="px-3 py-2 text-center">{r.track2_hours ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.track2_days ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.track2_status ? <StatusBadge status={r.track2_status} variant={statusColors[r.track2_status] as "success" | "warning" | "info" | "neutral"} /> : "—"}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={r.note}>{r.note}</td>
              </tr>
            )) : (
              <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CoursesHoursTab = () => {
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("all");
  const domains = useMemo(() => [...new Set(coursesHoursData.map(c => c.domain))], []);

  const filtered = useMemo(() =>
    coursesHoursData.filter(r => {
      const matchSearch = r.name.includes(search) || r.domain.includes(search);
      const matchDomain = filterDomain === "all" || r.domain === filterDomain;
      return matchSearch && matchDomain;
    }), [search, filterDomain]);

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + r.hours, 0), [filtered]);
  const totalNominees = useMemo(() => filtered.reduce((s, r) => s + r.nominees_count, 0), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الدورات..." className="ps-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button onClick={() => setFilterDomain("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterDomain === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>الكل</button>
          {domains.map(d => (
            <button key={d} onClick={() => setFilterDomain(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterDomain === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground no-print">
        <span>إجمالي الساعات: <strong className="text-foreground">{totalHours}</strong></span>
        <span>إجمالي المرشحين: <strong className="text-foreground">{totalNominees}</strong></span>
        <span>عدد الدورات: <strong className="text-foreground">{filtered.length}</strong></span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-2 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">ت</th>
              <th className="px-2 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">المجال</th>
              <th className="px-2 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">اسم الدورة</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الساعات</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الأيام</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">الأسابيع</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">أسبوع البدء</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">أسبوع الانتهاء</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">المسار</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">المرشحون</th>
              <th className="px-2 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">النسبة</th>
              <th className="px-2 py-2.5 text-start font-semibold text-foreground whitespace-nowrap">أساس الترشيح</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((r: CourseHoursRow) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-2 py-2 font-bold text-primary">{r.id}</td>
                <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{r.domain}</td>
                <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                <td className="px-2 py-2 text-center">{r.hours}</td>
                <td className="px-2 py-2 text-center">{r.days_needed}</td>
                <td className="px-2 py-2 text-center">{r.weeks_needed}</td>
                <td className="px-2 py-2 text-center">{r.start_week}</td>
                <td className="px-2 py-2 text-center">{r.end_week}</td>
                <td className="px-2 py-2 text-center whitespace-nowrap">{trackLabels[r.track] || r.track}</td>
                <td className="px-2 py-2 text-center font-semibold">{r.nominees_count}</td>
                <td className="px-2 py-2 text-center">{(r.nominees_ratio * 100).toFixed(1)}%</td>
                <td className="px-2 py-2 text-muted-foreground max-w-[180px] truncate" title={r.basis}>{r.basis}</td>
              </tr>
            )) : (
              <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ParticipantsByCourseTab = () => {
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const courses = useMemo(() => [...new Set(participantsByCourseData.map(p => p.course_name))], []);
  const courseCounts = useMemo(() => {
    const m = new Map<string, number>();
    participantsByCourseData.forEach(p => { m.set(p.course_name, (m.get(p.course_name) || 0) + 1); });
    return m;
  }, []);

  const filtered = useMemo(() =>
    participantsByCourseData.filter(r => {
      const matchSearch = r.name.includes(search) || r.course_name.includes(search);
      const matchCourse = filterCourse === "all" || r.course_name === filterCourse;
      return matchSearch && matchCourse;
    }), [search, filterCourse]);

  const groupedByCourse = useMemo(() => {
    const map = new Map<string, ParticipantByCourseRow[]>();
    filtered.forEach(r => {
      const arr = map.get(r.course_name) || [];
      arr.push(r);
      map.set(r.course_name, arr);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم..." className="ps-9" />
        </div>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background text-foreground">
          <option value="all">كل الدورات</option>
          {courses.map(c => <option key={c} value={c}>{c} ({courseCounts.get(c) || 0})</option>)}
        </select>
      </div>
      <div className="text-xs text-muted-foreground no-print">عدد السجلات: <strong className="text-foreground">{filtered.length}</strong></div>
      <div className="space-y-4">
        {groupedByCourse.size > 0 ? Array.from(groupedByCourse.entries()).map(([courseName, participants]) => (
          <Card key={courseName} className="overflow-hidden">
            <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">{courseName}</h3>
              <span className="text-xs text-muted-foreground">{participants[0]?.course_hours} ساعة — {participants.length} منتسب</span>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-3 py-2 text-start font-semibold text-foreground w-12">ت</th>
                      <th className="px-3 py-2 text-start font-semibold text-foreground">اسم المنتسب المرشح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.seq} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 text-primary font-semibold">{p.seq}</td>
                        <td className="px-3 py-1.5 text-foreground">{p.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 text-muted-foreground">لا توجد نتائج</div>
        )}
      </div>
    </div>
  );
};

const CoursesPerParticipantTab = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"hours" | "count" | "name">("hours");

  const sorted = useMemo(() => {
    const filtered = coursesPerParticipantData.filter(r => r.name.includes(search) || r.courses.includes(search));
    return [...filtered].sort((a, b) => {
      if (sortBy === "hours") return b.total_hours - a.total_hours;
      if (sortBy === "count") return b.course_count - a.course_count;
      return a.name.localeCompare(b.name, "ar");
    });
  }, [search, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الدورة..." className="ps-9" />
        </div>
        <div className="flex gap-1.5">
          {([["hours", "الساعات"], ["count", "الدورات"], ["name", "الاسم"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${sortBy === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-start font-semibold text-foreground w-12">ت</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground">اسم المنتسب</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">عدد الدورات</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground whitespace-nowrap">إجمالي الساعات</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground">الدورات</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? sorted.map((r: CoursesPerParticipantRow) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-bold text-primary">{r.id}</td>
                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-2 text-center">{r.course_count}</td>
                <td className="px-3 py-2 text-center font-semibold">{r.total_hours}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[300px]">
                  <div className="flex flex-wrap gap-1">
                    {r.courses.split("|").map((c, i) => (
                      <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] whitespace-nowrap">{c.trim()}</span>
                    ))}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ExecutiveSummaryTab = () => {
  const summaryEntries: { label: string; value: string | number }[] = [
    { label: "إجمالي المنتسبين", value: summaryData["إجمالي المنتسبين"] as number },
    { label: "إجمالي الدورات", value: summaryData["إجمالي الدورات"] as number },
    { label: "إجمالي ساعات الدورات", value: summaryData["إجمالي ساعات الدورات"] as number },
    { label: "الحد الأعلى لساعات المحاضرات يومياً", value: summaryData["الحد الأعلى لساعات المحاضرات يومياً"] as string },
    { label: "الحد الأعلى النظري للدورة أسبوعياً", value: summaryData["الحد الأعلى النظري للدورة أسبوعياً"] as string },
    { label: "عدد المسارات/القاعات المقترحة", value: summaryData["عدد المسارات/القاعات المقترحة"] as number },
    { label: "عدد الأسابيع الإجمالية", value: summaryData["عدد الأسابيع الإجمالية حسب الخطة الممتدة"] as number },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryEntries.map(entry => (
          <Card key={entry.label} className="bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{entry.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{entry.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-warning/5 border-warning/20">
        <CardContent className="p-4">
          <p className="text-xs text-foreground">{summaryData["ملاحظة"] as string}</p>
        </CardContent>
      </Card>
      <div>
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />أعلى الدورات من حيث عدد المرشحين</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 text-start font-semibold text-foreground">الدورة</th>
                <th className="px-3 py-2.5 text-center font-semibold text-foreground">عدد المرشحين</th>
                <th className="px-3 py-2.5 text-center font-semibold text-foreground">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {topCoursesData.map((c, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">{c.course}</td>
                  <td className="px-3 py-2 text-center font-semibold">{c.count}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${c.ratio * 100}%` }} />
                      </div>
                      <span>{(c.ratio * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CorrectionsTab = () => {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-start font-semibold text-foreground">رقم الدورة</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground">اسم الدورة</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground">الساعات بعد التصحيح</th>
              <th className="px-3 py-2.5 text-center font-semibold text-foreground">الأيام بحد 3 ساعات/يوم</th>
              <th className="px-3 py-2.5 text-start font-semibold text-foreground">ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {correctionsData.map((r: CorrectionRow) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-bold text-primary">{r.id}</td>
                <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                <td className="px-3 py-2 text-center font-semibold">{r.corrected_hours}</td>
                <td className="px-3 py-2 text-center">{r.corrected_days}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalHoursAfterCorrection}</p>
            <p className="text-xs text-muted-foreground mt-1">إجمالي ساعات الدورات بعد التصحيح</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalWeeks}</p>
            <p className="text-xs text-muted-foreground mt-1">عدد الأسابيع الإجمالي بعد التعديل</p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-info/5 border-info/20">
        <CardContent className="p-4">
          <p className="text-xs text-foreground">لم يتغير لأن الدورات المعدلة لا تتجاوز 15 ساعة أسبوعياً، أما الدورات الأطول مستمرة بالخطة.</p>
        </CardContent>
      </Card>
    </div>
  );
};

const tabItems = [
  { value: "weekly", label: "الخطة الممتدة أسبوعياً", icon: CalendarDays },
  { value: "courses", label: "الدورات وساعاتها", icon: BookOpen },
  { value: "participants", label: "المنتسبون حسب الدورة", icon: Users },
  { value: "per-person", label: "دورات كل منتسب", icon: User },
  { value: "summary", label: "ملخص تنفيذي", icon: BarChart3 },
  { value: "corrections", label: "تصحيحات الساعات", icon: Pencil },
] as const;

const TrainingPlan = () => {
  const [activeTab, setActiveTab] = useState("weekly");

  const exportData = () => {
    if (activeTab === "weekly") {
      return {
        filename: "weekly_plan",
        sheetName: "الخطة الممتدة أسبوعياً",
        rows: weeklyPlanData.map(r => ({
          الأسبوع: r.week,
          "المسار الأول / القاعة A": r.track1_name,
          ساعات: r.track1_hours,
          أيام: r.track1_days,
          حالة: r.track1_status,
          "المسار الثاني / القاعة B": r.track2_name,
          ساعات_2: r.track2_hours,
          أيام_2: r.track2_days,
          حالة_2: r.track2_status,
          ملاحظة: r.note,
        })),
      };
    }
    if (activeTab === "courses") {
      return {
        filename: "courses_hours",
        sheetName: "الدورات وساعاتها",
        rows: coursesHoursData.map(r => ({
          ت: r.id,
          المجال: r.domain,
          "اسم الدورة": r.name,
          "عدد الساعات": r.hours,
          الأيام: r.days_needed,
          الأسابيع: r.weeks_needed,
          "أسبوع البدء": r.start_week,
          "أسبوع الانتهاء": r.end_week,
          المسار: r.track,
          "عدد المرشحين": r.nominees_count,
          النسبة: `${(r.nominees_ratio * 100).toFixed(1)}%`,
          "أساس الترشيح": r.basis,
        })),
      };
    }
    if (activeTab === "participants") {
      return {
        filename: "participants_by_course",
        sheetName: "المنتسبون حسب الدورة",
        rows: participantsByCourseData.map(r => ({
          المجال: r.domain,
          الدورة: r.course_name,
          "عدد ساعات الدورة": r.course_hours,
          "اسم المنتسب المرشح": r.name,
          تسلسل: r.seq,
        })),
      };
    }
    if (activeTab === "per-person") {
      return {
        filename: "courses_per_participant",
        sheetName: "دورات كل منتسب",
        rows: coursesPerParticipantData.map(r => ({
          ت: r.id,
          "اسم المنتسب": r.name,
          "عدد الدورات": r.course_count,
          "إجمالي ساعات التدريب": r.total_hours,
          "الدورات": r.courses.replace(/\|/g, "\n"),
        })),
      };
    }
    if (activeTab === "summary") {
      return {
        filename: "executive_summary",
        sheetName: "ملخص تنفيذي",
        rows: [
          { البيان: "إجمالي المنتسبين", القيمة: summaryData["إجمالي المنتسبين"] },
          { البيان: "إجمالي الدورات", القيمة: summaryData["إجمالي الدورات"] },
          { البيان: "إجمالي ساعات الدورات", القيمة: summaryData["إجمالي ساعات الدورات"] },
          { البيان: "الحد الأعلى لساعات المحاضرات يومياً", القيمة: summaryData["الحد الأعلى لساعات المحاضرات يومياً"] },
          { البيان: "الحد الأعلى النظري للدورة أسبوعياً", القيمة: summaryData["الحد الأعلى النظري للدورة أسبوعياً"] },
          { البيان: "عدد المسارات/القاعات المقترحة", القيمة: summaryData["عدد المسارات/القاعات المقترحة"] },
          { البيان: "عدد الأسابيع الإجمالية", القيمة: summaryData["عدد الأسابيع الإجمالية حسب الخطة الممتدة"] },
          ...topCoursesData.map(c => ({ البيان: c.course, القيمة: `${c.count} (${(c.ratio * 100).toFixed(1)}%)` })),
        ],
      };
    }
    if (activeTab === "corrections") {
      return {
        filename: "hour_corrections",
        sheetName: "تصحيحات الساعات",
        rows: correctionsData.map(r => ({
          "رقم الدورة": r.id,
          "اسم الدورة": r.name,
          "الساعات بعد التصحيح": r.corrected_hours,
          "الأيام بحد 3 ساعات/يوم": r.corrected_days,
          ملاحظة: r.note,
        })),
      };
    }
    return { filename: "training_plan", rows: [] };
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <PageHeader title="الخطة التدريبية" subtitle="خطة دورات مكتب بابل — العرض التفاعلي" icon={CalendarDays} sections={[
        { id: "tabs_nav", label: "تبويبات الخطة" },
        { id: "data_table", label: "جدول البيانات" },
      ]} exportData={exportData} />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 no-print">
          {tabItems.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-1.5">
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="weekly" className="mt-4"><WeeklyPlanTab /></TabsContent>
        <TabsContent value="courses" className="mt-4"><CoursesHoursTab /></TabsContent>
        <TabsContent value="participants" className="mt-4"><ParticipantsByCourseTab /></TabsContent>
        <TabsContent value="per-person" className="mt-4"><CoursesPerParticipantTab /></TabsContent>
        <TabsContent value="summary" className="mt-4"><ExecutiveSummaryTab /></TabsContent>
        <TabsContent value="corrections" className="mt-4"><CorrectionsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingPlan;
