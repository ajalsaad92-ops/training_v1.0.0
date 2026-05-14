import { CurriculumItem } from "@/hooks/useSupabaseData";

// Check if a curriculum item has any empty/missing required fields
export const hasEmptyFields = (item: CurriculumItem): string[] => {
  const missing: string[] = [];
  if (!item.title?.trim()) missing.push("العنوان");
  if (!item.goals?.trim()) missing.push("الأهداف");
  if (!item.target_audience?.trim()) missing.push("الفئة المستهدفة");
  if (!item.trainer_name?.trim()) missing.push("المدرب");
  if (!item.hours || item.hours <= 0) missing.push("الساعات");
  if (!item.location?.trim()) missing.push("المكان");
  if (!item.executor_name?.trim()) missing.push("المنفذ");
  if (!item.training_style?.trim()) missing.push("أسلوب التدريب");
  return missing;
};

export const getItemsWithEmptyFields = (items: CurriculumItem[]) =>
  items.filter(item => hasEmptyFields(item).length > 0);

// Curriculum stages
export type CurriculumStage = "form" | "auditing" | "printing" | "done";

export const computeStage = (item: CurriculumItem): CurriculumStage => {
  if (item.printed || item.hard_copy_printed) return "done";
  if (item.audit_status === "approved" || item.audit_status === "done") return "printing";
  if (item.form_type === "new" && item.audit_status !== "not_started") return "auditing";
  return "form";
};

export const stageLabels: Record<CurriculumStage, string> = {
  form: "فورمة",
  auditing: "تدقيق",
  printing: "طباعة",
  done: "منجز",
};

export const stageColors: Record<CurriculumStage, string> = {
  form: "bg-muted text-muted-foreground",
  auditing: "bg-warning/15 text-warning",
  printing: "bg-accent/15 text-accent",
  done: "bg-success/15 text-success",
};

// PPT stages
export type PptStage = "new_ppt" | "ppt_done" | "pdf";

export const computePptStage = (item: CurriculumItem): PptStage => {
  if (item.file_type === "pdf" || (item.file_url && item.file_type === "pdf")) return "pdf";
  if (item.presentation_uploaded) return "ppt_done";
  return "new_ppt";
};

export const pptStageLabels: Record<PptStage, string> = {
  new_ppt: "جديد",
  ppt_done: "جاهز",
  pdf: "PDF",
};

export const pptStageColors: Record<PptStage, string> = {
  new_ppt: "bg-muted text-muted-foreground",
  ppt_done: "bg-success/15 text-success",
  pdf: "bg-accent/15 text-accent",
};

// Count items per stage
export const countByStage = (items: CurriculumItem[]) => {
  const counts: Record<CurriculumStage, number> = { form: 0, auditing: 0, printing: 0, done: 0 };
  items.forEach(item => { counts[computeStage(item)]++; });
  return counts;
};

export const countByPptStage = (items: CurriculumItem[]) => {
  const counts: Record<PptStage, number> = { new_ppt: 0, ppt_done: 0, pdf: 0 };
  items.forEach(item => { counts[computePptStage(item)]++; });
  return counts;
};
