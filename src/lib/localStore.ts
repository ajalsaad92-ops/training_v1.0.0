import { debouncedPush, getServerAvailable } from "@/lib/serverSync";
import {
  SEED_EMPLOYEES, SEED_PROFILES, SEED_USER_ACCOUNTS, SEED_CURRICULUM,
  SEED_COURSES, SEED_TRAINEES, SEED_HR, SEED_CORRESPONDENCE, SEED_TASKS,
  SEED_GOV_TRAINING, SEED_FOLLOWUP_RECORDS, SEED_FOLLOWUP_NOTIFS,
  SEED_NOTIFICATIONS, SEED_AUDIT_LOG, SEED_WEEK_SCHEDULES,
} from "@/lib/seedData";

const SEED_VERSION_KEY = "tms_seed_version";
const SEED_VERSION = "2026-05-19-v1";



/* eslint-disable @typescript-eslint/no-explicit-any */
export type Employee = any;
export type Course = any;
export type CourseTrainee = any;
export type HRRequest = any;
export type CurriculumItem = any;
export type CorrespondenceItem = any;
export type AuditEntry = any;
export type Notification = any;
export type Task = any;
export type TaskHandover = any;
export type TaskComment = any;
export type GovernorateTraining = any;
export type FollowUpRecord = any;
export type FollowUpNotification = any;
export type TrainingPlanImport = any;
export type WeekScheduleEntry = any;

export interface UserProfile {
  id: string;
  name: string;
  department: string;
  section: string;
  position: string;
  phone: string;
  roles: string[];
}

export interface UserAccount {
  id?: string;
  email: string;
  password: string;
  profile: UserProfile;
}

const STORAGE_KEY = "tms_local_store";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().split("T")[0];

const defaultEmployees: Employee[] = [
  { id: "emp-1", name: "أحمد محمد العلي", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مدير النظام", phone: "0501234567", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-2", name: "فاطمة حسن الأمير", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مدير القسم", phone: "0507654321", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-3", name: "خالد عبدالله السعيد", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "رئيس شعبة الإعداد", phone: "0509876543", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-4", name: "نورة سعد المالكي", department: "شعبة المناهج", section: "شعبة المناهج", position: "رئيس شعبة المناهج", phone: "0502345678", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-5", name: "محمد علي الزهراني", department: "شعبة المناهج", section: "شعبة المناهج", position: "مدرب أول", phone: "0503456789", work_schedule: "shift_7x7", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-6", name: "سارة يوسف القحطاني", department: "الإدارة العامة", section: "الأرشيف", position: "إدارية", phone: "0504567890", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-7", name: "عبدالرحمن فهد الشمري", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مقيّم تدريب", phone: "0505678901", work_schedule: "shift_15x15", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "emp-8", name: "هند ماجد العتيبي", department: "المالية", section: "الميزانية", position: "محاسبة", phone: "0506789012", work_schedule: "daily", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
];

const defaultCourses: Course[] = [
  { id: "crs-1", title: "إدارة المشاريع الاحترافية", code: "PMP-001", type: "internal", training_type: "developmental", venue: "قاعة التدريب الرئيسية", start_date: "2026-02-20", end_date: "2026-02-25", trainer: "أحمد محمد العلي", trainer_id: "emp-1", supervisor: "فاطمة حسن الأمير", supervisor_id: "emp-2", sponsor: "وزارة التعليم", status: "active", estimated_budget: 50000, actual_cost: 42000, created_by: "emp-1", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z" },
  { id: "crs-2", title: "الأمن السيبراني المتقدم", code: "CS-002", type: "external", training_type: "specialized", venue: "مركز التدريب التقني", start_date: "2026-03-01", end_date: "2026-03-05", trainer: "محمد علي الزهراني", trainer_id: "emp-5", supervisor: "أحمد محمد العلي", supervisor_id: "emp-1", sponsor: "الهيئة الوطنية", status: "planned", estimated_budget: 75000, actual_cost: 0, created_by: "emp-1", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z" },
  { id: "crs-3", title: "مهارات القيادة والإدارة", code: "LD-003", type: "internal", training_type: "developmental", venue: "القاعة الذكية", start_date: "2026-01-10", end_date: "2026-01-15", trainer: "فاطمة حسن الأمير", trainer_id: "emp-2", supervisor: "خالد عبدالله السعيد", supervisor_id: "emp-3", sponsor: "داخلي", status: "completed", estimated_budget: 30000, actual_cost: 28500, created_by: "emp-2", created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z" },
  { id: "crs-4", title: "تحليل البيانات وذكاء الأعمال", code: "DA-004", type: "external", training_type: "specialized", venue: "أكاديمية البيانات", start_date: "2026-03-15", end_date: "2026-03-20", trainer: "خبير خارجي", trainer_id: null, supervisor: "فاطمة حسن الأمير", supervisor_id: "emp-2", sponsor: "صندوق التنمية", status: "planned", estimated_budget: 90000, actual_cost: 0, created_by: "emp-2", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z" },
  { id: "crs-5", title: "خدمة العملاء المتميزة", code: "CS-005", type: "internal", training_type: "developmental", venue: "قاعة التدريب ب", start_date: "2026-02-18", end_date: "2026-02-19", trainer: "نورة سعد المالكي", trainer_id: "emp-4", supervisor: "أحمد محمد العلي", supervisor_id: "emp-1", sponsor: "داخلي", status: "active", estimated_budget: 15000, actual_cost: 12000, created_by: "emp-4", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z" },
];

const defaultTrainees: CourseTrainee[] = [
  { id: "tr-1", course_id: "crs-1", employee_id: "emp-3", name: "خالد عبدالله السعيد", status: "waiting", certificate_issued: false, created_at: "2026-02-01T08:00:00Z" },
  { id: "tr-2", course_id: "crs-1", employee_id: "emp-4", name: "نورة سعد المالكي", status: "waiting", certificate_issued: false, created_at: "2026-02-01T08:00:00Z" },
  { id: "tr-3", course_id: "crs-2", employee_id: "emp-6", name: "سارة يوسف القحطاني", status: "waiting", certificate_issued: false, created_at: "2026-02-01T08:00:00Z" },
  { id: "tr-4", course_id: "crs-3", employee_id: "emp-7", name: "عبدالرحمن فهد الشمري", status: "passed", certificate_issued: true, created_at: "2026-01-01T08:00:00Z" },
  { id: "tr-5", course_id: "crs-3", employee_id: "emp-8", name: "هند ماجد العتيبي", status: "passed", certificate_issued: true, created_at: "2026-01-01T08:00:00Z" },
  { id: "tr-6", course_id: "crs-3", employee_id: "emp-5", name: "محمد علي الزهراني", status: "failed", certificate_issued: false, created_at: "2026-01-01T08:00:00Z" },
  { id: "tr-7", course_id: "crs-5", employee_id: "emp-1", name: "أحمد محمد العلي", status: "waiting", certificate_issued: false, created_at: "2026-02-01T08:00:00Z" },
];

const defaultHRRequests: HRRequest[] = [
  { id: "hr-1", employee_name: "أحمد محمد العلي", department: "شعبة الإعداد والتدريب", type: "إجازة اعتيادية", date: "2026-02-15", approval_status: "pending", notes: "إجازة لمدة 3 أيام", created_by: "emp-1", created_at: "2026-02-14T10:00:00Z", updated_at: "2026-02-14T10:00:00Z", unit_head_status: "pending", unit_head_by: null, unit_head_at: null, dept_manager_status: "pending", dept_manager_by: null, dept_manager_at: null },
  { id: "hr-2", employee_name: "فاطمة حسن الأمير", department: "شعبة الإعداد والتدريب", type: "مأمورية", date: "2026-02-14", approval_status: "unit_approved", notes: "زيارة ميدانية", created_by: "emp-2", created_at: "2026-02-13T09:00:00Z", updated_at: "2026-02-13T14:00:00Z", unit_head_status: "approved", unit_head_by: "emp-3", unit_head_at: "2026-02-13T12:00:00Z", dept_manager_status: "pending", dept_manager_by: null, dept_manager_at: null },
  { id: "hr-3", employee_name: "خالد عبدالله السعيد", department: "شعبة الإعداد والتدريب", type: "إجازة مرضية", date: "2026-02-13", approval_status: "approved", notes: "تقرير طبي مرفق", created_by: "emp-3", created_at: "2026-02-12T08:00:00Z", updated_at: "2026-02-12T16:00:00Z", unit_head_status: "approved", unit_head_by: "emp-3", unit_head_at: "2026-02-12T10:00:00Z", dept_manager_status: "approved", dept_manager_by: "emp-2", dept_manager_at: "2026-02-12T14:00:00Z" },
  { id: "hr-4", employee_name: "نورة سعد المالكي", department: "شعبة المناهج", type: "خروجية", date: "2026-02-15", approval_status: "pending", notes: "مراجعة جهة حكومية", created_by: "emp-4", created_at: "2026-02-14T11:00:00Z", updated_at: "2026-02-14T11:00:00Z", unit_head_status: "pending", unit_head_by: null, unit_head_at: null, dept_manager_status: "pending", dept_manager_by: null, dept_manager_at: null },
  { id: "hr-5", employee_name: "محمد علي الزهراني", department: "شعبة المناهج", type: "إجازة اعتيادية", date: "2026-02-12", approval_status: "rejected", notes: "رصيد الإجازات مستنفذ", created_by: "emp-5", created_at: "2026-02-11T09:00:00Z", updated_at: "2026-02-11T15:00:00Z", unit_head_status: "rejected", unit_head_by: "emp-4", unit_head_at: "2026-02-11T11:00:00Z", dept_manager_status: "pending", dept_manager_by: null, dept_manager_at: null },
  { id: "hr-6", employee_name: "سارة يوسف القحطاني", department: "الإدارة العامة", type: "غياب", date: "2026-02-11", approval_status: "approved", notes: "غياب بعذر طبي", created_by: "emp-6", created_at: "2026-02-10T08:00:00Z", updated_at: "2026-02-10T16:00:00Z", unit_head_status: "approved", unit_head_by: "emp-2", unit_head_at: "2026-02-10T10:00:00Z", dept_manager_status: "approved", dept_manager_by: "emp-1", dept_manager_at: "2026-02-10T14:00:00Z" },
];

const defaultCurriculum: CurriculumItem[] = [
  { id: "cur-1", title: "منهج إدارة المشاريع", goals: "تأهيل المتدربين لاختبار PMP", target_audience: "مدراء المشاريع", count: 25, training_style: "ورشة عمل", type: "developmental", status: "applied", report_uploaded: true, presentation_uploaded: true, created_by: "emp-4", created_at: "2026-01-15T08:00:00Z", updated_at: "2026-02-01T08:00:00Z", printed: true, form_type: "new", ppt_type: "new", executor_type: "internal", executor_name: "أحمد محمد العلي", hours: 40, applied: true, location: "قاعة التدريب الرئيسية", trainer_name: "أحمد محمد العلي", audience_count: 25, audit_status: "done", file_url: "", file_type: "pdf", hard_copy_printed: true, current_stage: "done", assigned_to: "emp-1", handed_over_by: null, handed_over_at: null },
  { id: "cur-2", title: "منهج الأمن السيبراني", goals: "رفع الوعي الأمني التقني", target_audience: "جميع الموظفين", count: 50, training_style: "محاضرة", type: "specialized", status: "applied", report_uploaded: false, presentation_uploaded: true, created_by: "emp-4", created_at: "2026-01-20T08:00:00Z", updated_at: "2026-02-01T08:00:00Z", printed: false, form_type: "new", ppt_type: "new", executor_type: "external", executor_name: "شركة الأمن التقني", hours: 24, applied: true, location: "مركز التدريب التقني", trainer_name: "خبير خارجي", audience_count: 30, audit_status: "in_progress", file_url: "", file_type: "", hard_copy_printed: false, current_stage: "auditing", assigned_to: "emp-5", handed_over_by: null, handed_over_at: null },
  { id: "cur-3", title: "منهج القيادة", goals: "تطوير المهارات القيادية", target_audience: "رؤساء الأقسام", count: 15, training_style: "تدريب تفاعلي", type: "developmental", status: "not_applied", report_uploaded: false, presentation_uploaded: false, created_by: "emp-4", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z", printed: false, form_type: "old", ppt_type: "old", executor_type: "internal", executor_name: "فاطمة حسن الأمير", hours: 0, applied: false, location: "", trainer_name: "", audience_count: 0, audit_status: "not_started", file_url: "", file_type: "", hard_copy_printed: false, current_stage: "writing", assigned_to: null, handed_over_by: null, handed_over_at: null },
  { id: "cur-4", title: "منهج تحليل البيانات", goals: "إتقان أدوات التحليل المتقدمة", target_audience: "المحللون", count: 20, training_style: "ورشة عملية", type: "specialized", status: "applied", report_uploaded: true, presentation_uploaded: true, created_by: "emp-4", created_at: "2026-02-05T08:00:00Z", updated_at: "2026-02-05T08:00:00Z", printed: true, form_type: "new", ppt_type: "new", executor_type: "external", executor_name: "أكاديمية البيانات", hours: 32, applied: true, location: "أكاديمية البيانات", trainer_name: "خبير بيانات", audience_count: 20, audit_status: "done", file_url: "", file_type: "pdf", hard_copy_printed: true, current_stage: "done", assigned_to: "emp-5", handed_over_by: "emp-4", handed_over_at: "2026-02-10T08:00:00Z" },
];

const defaultCorrespondence: CorrespondenceItem[] = [
  { id: "cor-1", number: "ص/2026/001", date: "2026-02-10", subject: "طلب تنسيق برنامج تدريبي", from: "إدارة التدريب", to: "وزارة التعليم", type: "outgoing_external", status: "in_progress", summary: "التنسيق لعقد برنامج تدريبي مشترك", created_by: "emp-2", created_at: "2026-02-10T08:00:00Z", updated_at: "2026-02-10T08:00:00Z" },
  { id: "cor-2", number: "و/2026/015", date: "2026-02-08", subject: "الموافقة على الميزانية التدريبية", from: "الإدارة المالية", to: "إدارة التدريب", type: "incoming_internal", status: "done", summary: "تمت الموافقة على ميزانية الربع الأول", created_by: "emp-6", created_at: "2026-02-08T08:00:00Z", updated_at: "2026-02-08T08:00:00Z" },
  { id: "cor-3", number: "ص/2026/002", date: "2026-02-12", subject: "دعوة لحضور ملتقى تدريبي", from: "إدارة التدريب", to: "فروع المحافظات", type: "outgoing_internal", status: "in_progress", summary: "دعوة لحضور الملتقى السنوي", created_by: "emp-2", created_at: "2026-02-12T08:00:00Z", updated_at: "2026-02-12T08:00:00Z" },
  { id: "cor-4", number: "و/2026/020", date: "2026-02-05", subject: "تقرير إنجاز سنوي", from: "الجهة الرقابية", to: "إدارة التدريب", type: "incoming_external", status: "archived", summary: "طلب تقديم تقرير الإنجاز السنوي", created_by: null, created_at: "2026-02-05T08:00:00Z", updated_at: "2026-02-05T08:00:00Z" },
  { id: "cor-5", number: "ص/2026/003", date: "2026-02-14", subject: "متابعة شهادات التدريب", from: "شعبة التنفيذ", to: "شعبة المناهج", type: "outgoing_internal", status: "in_progress", summary: "متابعة إصدار شهادات الدورة المنتهية", created_by: "emp-3", created_at: "2026-02-14T08:00:00Z", updated_at: "2026-02-14T08:00:00Z" },
];

const defaultTasks: Task[] = [
  { id: "tsk-1", title: "إعداد منهج الأمن السيبراني", description: "كتابة المحتوى التعليمي للمنهج", unit: "المناهج", stage: "auditing", status: "in_progress", assigned_to: "emp-5", assigned_by: "emp-4", previous_owner: null, handed_over: false, handed_over_at: null, curriculum_item_id: "cur-2", achievement_points: 2, estimated_hours: 40, is_routine: false, created_by: "emp-4", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-10T08:00:00Z" },
  { id: "tsk-2", title: "تنسيق دورة PMP", description: "ترتيب القاعة والمدرب", unit: "الإعداد", stage: "routine", status: "completed", assigned_to: "emp-3", assigned_by: "emp-2", previous_owner: null, handed_over: true, handed_over_at: "2026-02-18T08:00:00Z", curriculum_item_id: null, achievement_points: 1, estimated_hours: 8, is_routine: true, created_by: "emp-2", created_at: "2026-02-10T08:00:00Z", updated_at: "2026-02-18T08:00:00Z" },
  { id: "tsk-3", title: "تحديث منهج القيادة", description: "تحديث المحتوى القديم", unit: "المناهج", stage: "new_form", status: "pending", assigned_to: "emp-4", assigned_by: "emp-2", previous_owner: null, handed_over: false, handed_over_at: null, curriculum_item_id: "cur-3", achievement_points: 0, estimated_hours: 20, is_routine: false, created_by: "emp-2", created_at: "2026-02-05T08:00:00Z", updated_at: "2026-02-05T08:00:00Z" },
  { id: "tsk-4", title: "متابعة إصدار الشهادات", description: "إصدار شهادات الدورة المنتهية", unit: "الإعداد", stage: "routine", status: "in_progress", assigned_to: "emp-7", assigned_by: "emp-3", previous_owner: null, handed_over: false, handed_over_at: null, curriculum_item_id: null, achievement_points: 0, estimated_hours: 4, is_routine: true, created_by: "emp-3", created_at: "2026-02-15T08:00:00Z", updated_at: "2026-02-15T08:00:00Z" },
  { id: "tsk-5", title: "رفع عرض القيادة", description: "إعداد العرض التقديمي", unit: "المناهج", stage: "new_ppt", status: "review", assigned_to: "emp-5", assigned_by: "emp-4", previous_owner: null, handed_over: false, handed_over_at: null, curriculum_item_id: "cur-3", achievement_points: 1, estimated_hours: 6, is_routine: false, created_by: "emp-4", created_at: "2026-02-08T08:00:00Z", updated_at: "2026-02-14T08:00:00Z" },
];

const defaultNotifications: Notification[] = [
  { id: "notif-1", user_id: null, message: "دورة 'إدارة المشاريع الاحترافية' تبدأ خلال 5 أيام", type: "warning", is_read: false, date: "2026-02-15", created_at: "2026-02-15T08:00:00Z", link: "/courses?focus=crs-1" },
  { id: "notif-2", user_id: null, message: "3 مراسلات قيد الإجراء تحتاج متابعة", type: "info", is_read: false, date: "2026-02-15", created_at: "2026-02-15T08:00:00Z", link: "/correspondence" },
  { id: "notif-3", user_id: null, message: "تمت الموافقة على ميزانية الربع الأول", type: "info", is_read: true, date: "2026-02-14", created_at: "2026-02-14T08:00:00Z", link: "/correspondence?focus=cor-2" },
  { id: "notif-4", user_id: "emp-5", message: "ملاحظة جديدة من رئيس الشعبة على مهمة: إعداد منهج الأمن السيبراني", type: "warning", is_read: false, date: "2026-02-14", created_at: "2026-02-14T10:30:00Z", link: "/tasks?focus=tsk-1" },
  { id: "notif-5", user_id: "emp-5", message: "تم تسليم مهمة إليك: رفع عرض القيادة", type: "info", is_read: false, date: "2026-02-13", created_at: "2026-02-13T09:00:00Z", link: "/tasks?focus=tsk-5" },
  { id: "notif-6", user_id: "emp-3", message: "وافق مدير القسم على طلب إجازتك المرضية", type: "info", is_read: true, date: "2026-02-12", created_at: "2026-02-12T14:05:00Z", link: "/hr?focus=hr-3" },
  { id: "notif-7", user_id: "emp-4", message: "دورة 'تحليل البيانات' بحاجة إلى تأكيد المتدربين", type: "warning", is_read: false, date: "2026-02-15", created_at: "2026-02-15T11:00:00Z", link: "/courses?focus=crs-4" },
  { id: "notif-8", user_id: "emp-1", message: "طلب إجازة جديد من أحمد محمد العلي بانتظار اعتمادك", type: "info", is_read: false, date: "2026-02-14", created_at: "2026-02-14T10:05:00Z", link: "/hr?focus=hr-1" },
  { id: "notif-9", user_id: "emp-2", message: "مهمة 'تحديث منهج القيادة' بانتظار قبولك للبدء", type: "info", is_read: false, date: "2026-02-05", created_at: "2026-02-05T08:30:00Z", link: "/tasks?focus=tsk-3" },
  { id: "notif-10", user_id: "emp-7", message: "تم اعتماد مهمتك: متابعة إصدار الشهادات (+1 نقطة)", type: "info", is_read: true, date: "2026-02-15", created_at: "2026-02-15T13:00:00Z", link: "/tasks?focus=tsk-4" },
  { id: "notif-11", user_id: null, message: "منهج 'الأمن السيبراني' في مرحلة التدقيق", type: "info", is_read: false, date: "2026-02-12", created_at: "2026-02-12T09:00:00Z", link: "/curriculum?focus=cur-2" },
  { id: "notif-12", user_id: "emp-5", message: "تذكير: 5 ساعات متبقية لإنجاز مهمة الأمن السيبراني", type: "warning", is_read: false, date: "2026-02-15", created_at: "2026-02-15T07:00:00Z", link: "/tasks?focus=tsk-1" },
];

const defaultAuditLog: AuditEntry[] = [
  { id: "aud-1", user_name: "أحمد محمد العلي", action: "تعديل حالة الدورة", target: "إدارة المشاريع الاحترافية", timestamp: "2026-02-15T09:30:00Z" },
  { id: "aud-2", user_name: "فاطمة حسن الأمير", action: "إضافة متدرب", target: "الأمن السيبراني المتقدم", timestamp: "2026-02-14T14:15:00Z" },
  { id: "aud-3", user_name: "خالد عبدالله السعيد", action: "الموافقة على إجازة", target: "طلب إجازة - نورة المالكي", timestamp: "2026-02-14T11:00:00Z" },
  { id: "aud-4", user_name: "سارة القحطاني", action: "رفع مراسلة", target: "ص/2026/003", timestamp: "2026-02-14T16:45:00Z" },
];

const defaultTaskHandovers: TaskHandover[] = [
  { id: "th-1", task_id: "tsk-2", from_user_id: "emp-2", from_user_name: "فاطمة حسن الأمير", to_user_id: "emp-3", to_user_name: "خالد عبدالله السعيد", stage: "routine", notes: "تم التسليم للتنفيذ", created_at: "2026-02-18T08:00:00Z" },
  { id: "th-2", task_id: "tsk-5", from_user_id: "emp-4", from_user_name: "نورة سعد المالكي", to_user_id: "emp-5", to_user_name: "محمد علي الزهراني", stage: "new_ppt", notes: "أرجو إنهاء العرض قبل نهاية الأسبوع", created_at: "2026-02-13T08:30:00Z" },
  { id: "th-3", task_id: "tsk-4", from_user_id: "emp-3", from_user_name: "خالد عبدالله السعيد", to_user_id: "emp-7", to_user_name: "عبدالرحمن فهد الشمري", stage: "routine", notes: "متابعة دقيقة وإصدار خلال يومين", created_at: "2026-02-15T08:15:00Z" },
];

const defaultTaskComments: TaskComment[] = [
  { id: "cmt-1", task_id: "tsk-1", author_id: "emp-4", author_name: "نورة سعد المالكي", recipient_id: "emp-5", recipient_name: "محمد علي الزهراني", message: "يرجى التركيز على فصل الهجمات السيبرانية الحديثة وإضافة أمثلة عملية.", created_at: "2026-02-05T10:15:00Z" },
  { id: "cmt-2", task_id: "tsk-1", author_id: "emp-5", author_name: "محمد علي الزهراني", recipient_id: "emp-4", recipient_name: "نورة سعد المالكي", message: "تم. سأضيف ثلاث حالات دراسية وأرفع المسودة الأولى غداً.", created_at: "2026-02-05T11:40:00Z" },
  { id: "cmt-3", task_id: "tsk-1", author_id: "emp-4", author_name: "نورة سعد المالكي", recipient_id: "emp-5", recipient_name: "محمد علي الزهراني", message: "ممتاز. لا تنسَ مراجعة المعايير الوطنية للأمن السيبراني.", created_at: "2026-02-10T09:00:00Z" },
  { id: "cmt-4", task_id: "tsk-3", author_id: "emp-2", author_name: "فاطمة حسن الأمير", recipient_id: "emp-4", recipient_name: "نورة سعد المالكي", message: "نحتاج تحديث المحتوى ليتوافق مع منهج 2026، أرجو البدء فوراً.", created_at: "2026-02-05T09:00:00Z" },
  { id: "cmt-5", task_id: "tsk-5", author_id: "emp-4", author_name: "نورة سعد المالكي", recipient_id: "emp-5", recipient_name: "محمد علي الزهراني", message: "العرض جميل، فقط أعد تنسيق الشريحة 12 و 18 ثم أعتمده.", created_at: "2026-02-14T10:00:00Z" },
  { id: "cmt-6", task_id: "tsk-2", author_id: "emp-2", author_name: "فاطمة حسن الأمير", recipient_id: "emp-3", recipient_name: "خالد عبدالله السعيد", message: "تأكد من وصول جميع المتدربين قبل الجلسة بنصف ساعة.", created_at: "2026-02-17T15:00:00Z" },
  { id: "cmt-7", task_id: "tsk-2", author_id: "emp-3", author_name: "خالد عبدالله السعيد", recipient_id: "emp-2", recipient_name: "فاطمة حسن الأمير", message: "تم بحمد الله، الجميع حضر والقاعة جاهزة.", created_at: "2026-02-18T07:45:00Z" },
  { id: "cmt-8", task_id: "tsk-4", author_id: "emp-3", author_name: "خالد عبدالله السعيد", recipient_id: "emp-7", recipient_name: "عبدالرحمن فهد الشمري", message: "أرجو إصدار الشهادات اليوم وإرسال الكشف.", created_at: "2026-02-15T08:30:00Z" },
  { id: "cmt-9", task_id: "tsk-4", author_id: "emp-7", author_name: "عبدالرحمن فهد الشمري", recipient_id: "emp-3", recipient_name: "خالد عبدالله السعيد", message: "جاري الإصدار، سأرسل الكشف خلال ساعتين.", created_at: "2026-02-15T09:10:00Z" },
];

const defaultGovernorateTraining: GovernorateTraining[] = [
  { id: "gt-1", governorate: "بابل", course_name: "دورة تقنية SMART", domain: "تقنية المعلومات", course_hours: 10, track: "المسار الأول", nominees_count: 36, planned_start_date: "2026-03-01", planned_end_date: "2026-03-05", actual_start_date: "2026-03-01", actual_end_date: "2026-03-05", status: "completed", compliance: "completed", notes: "", created_by: "emp-1", created_at: "2026-03-01T08:00:00Z", updated_at: "2026-03-05T14:00:00Z" },
  { id: "gt-2", governorate: "بابل", course_name: "دورة إعداد التقارير", domain: "إدارية", course_hours: 10, track: "المسار الثاني", nominees_count: 20, planned_start_date: "2026-03-08", planned_end_date: "2026-03-12", actual_start_date: "2026-03-09", actual_end_date: "2026-03-13", status: "completed", compliance: "delayed", notes: "تأخر يوم واحد", created_by: "emp-1", created_at: "2026-03-08T08:00:00Z", updated_at: "2026-03-13T14:00:00Z" },
  { id: "gt-3", governorate: "بابل", course_name: "دورة المخاطبات الإدارية", domain: "إدارية", course_hours: 5, track: "المسار الأول", nominees_count: 15, planned_start_date: "2026-05-10", planned_end_date: "2026-05-14", actual_start_date: "2026-05-10", actual_end_date: null, status: "in_progress", compliance: "on_track", notes: "", created_by: "emp-2", created_at: "2026-05-10T08:00:00Z", updated_at: "2026-05-12T10:00:00Z" },
  { id: "gt-4", governorate: "بغداد", course_name: "دورة أخلاقيات العمل", domain: "إدارية", course_hours: 9, track: "المسار الأول", nominees_count: 25, planned_start_date: "2026-03-15", planned_end_date: "2026-03-19", actual_start_date: "2026-03-15", actual_end_date: "2026-03-19", status: "completed", compliance: "on_track", notes: "", created_by: "emp-1", created_at: "2026-03-15T08:00:00Z", updated_at: "2026-03-19T14:00:00Z" },
  { id: "gt-5", governorate: "بغداد", course_name: "دورة الإدارة الإلكترونية / الوورد", domain: "تقنية المعلومات", course_hours: 15, track: "المسار الثاني", nominees_count: 30, planned_start_date: "2026-04-01", planned_end_date: "2026-04-08", actual_start_date: "2026-04-03", actual_end_date: "2026-04-10", status: "completed", compliance: "delayed", notes: "تأخر بدء الدورة يومين", created_by: "emp-1", created_at: "2026-04-01T08:00:00Z", updated_at: "2026-04-10T14:00:00Z" },
  { id: "gt-6", governorate: "بغداد", course_name: "دورة القيادة التحويلية", domain: "قيادية", course_hours: 10, track: "المسار الأول", nominees_count: 22, planned_start_date: "2026-05-18", planned_end_date: "2026-05-22", actual_start_date: null, actual_end_date: null, status: "delayed", compliance: "delayed", notes: "لم يبدأ بعد رغم حلول الموعد", created_by: "emp-2", created_at: "2026-05-15T08:00:00Z", updated_at: "2026-05-18T08:00:00Z" },
  { id: "gt-7", governorate: "كربلاء", course_name: "دورة الحفظ والأرشفة", domain: "إدارية", course_hours: 6, track: "المسار الأول", nominees_count: 12, planned_start_date: "2026-03-22", planned_end_date: "2026-03-25", actual_start_date: "2026-03-22", actual_end_date: "2026-03-25", status: "completed", compliance: "on_track", notes: "", created_by: "emp-3", created_at: "2026-03-22T08:00:00Z", updated_at: "2026-03-25T14:00:00Z" },
  { id: "gt-8", governorate: "كربلاء", course_name: "دورة مهارات التواصل", domain: "إدارية", course_hours: 8, track: "المسار الثاني", nominees_count: 18, planned_start_date: "2026-04-12", planned_end_date: "2026-04-16", actual_start_date: "2026-04-12", actual_end_date: "2026-04-16", status: "completed", compliance: "on_track", notes: "", created_by: "emp-3", created_at: "2026-04-12T08:00:00Z", updated_at: "2026-04-16T14:00:00Z" },
  { id: "gt-9", governorate: "كربلاء", course_name: "دورة بناء الفريق", domain: "قيادية", course_hours: 8, track: "المسار الأول", nominees_count: 15, planned_start_date: "2026-06-01", planned_end_date: "2026-06-05", actual_start_date: null, actual_end_date: null, status: "planned", compliance: "not_started", notes: "", created_by: "emp-3", created_at: "2026-05-15T08:00:00Z", updated_at: "2026-05-15T08:00:00Z" },
  { id: "gt-10", governorate: "النجف", course_name: "دورة الإدارة الإلكترونية / Power Point", domain: "تقنية المعلومات", course_hours: 15, track: "المسار الأول", nominees_count: 28, planned_start_date: "2026-04-06", planned_end_date: "2026-04-13", actual_start_date: "2026-04-06", actual_end_date: "2026-04-13", status: "completed", compliance: "on_track", notes: "", created_by: "emp-1", created_at: "2026-04-06T08:00:00Z", updated_at: "2026-04-13T14:00:00Z" },
  { id: "gt-11", governorate: "النجف", course_name: "دورة تنمية الذكاء العاطفي", domain: "إدارية", course_hours: 6, track: "المسار الثاني", nominees_count: 20, planned_start_date: "2026-05-04", planned_end_date: "2026-05-07", actual_start_date: "2026-05-05", actual_end_date: null, status: "in_progress", compliance: "delayed", notes: "تأخر يوم بسبب ظروف الطقس", created_by: "emp-2", created_at: "2026-05-04T08:00:00Z", updated_at: "2026-05-06T10:00:00Z" },
  { id: "gt-12", governorate: "القادسية", course_name: "دورة إدارة الوقت", domain: "إدارية", course_hours: 5, track: "المسار الأول", nominees_count: 14, planned_start_date: "2026-03-28", planned_end_date: "2026-03-31", actual_start_date: "2026-03-28", actual_end_date: "2026-03-31", status: "completed", compliance: "on_track", notes: "", created_by: "emp-3", created_at: "2026-03-28T08:00:00Z", updated_at: "2026-03-31T14:00:00Z" },
  { id: "gt-13", governorate: "القادسية", course_name: "دورة الإدارة الإلكترونية / Excel", domain: "تقنية المعلومات", course_hours: 15, track: "المسار الثاني", nominees_count: 32, planned_start_date: "2026-05-11", planned_end_date: "2026-05-18", actual_start_date: "2026-05-11", actual_end_date: null, status: "in_progress", compliance: "on_track", notes: "", created_by: "emp-1", created_at: "2026-05-11T08:00:00Z", updated_at: "2026-05-15T10:00:00Z" },
  { id: "gt-14", governorate: "القادسية", course_name: "دورة تحليل المشكلات", domain: "إدارية", course_hours: 6, track: "المسار الأول", nominees_count: 12, planned_start_date: "2026-06-08", planned_end_date: "2026-06-11", actual_start_date: null, actual_end_date: null, status: "planned", compliance: "not_started", notes: "", created_by: "emp-3", created_at: "2026-05-20T08:00:00Z", updated_at: "2026-05-20T08:00:00Z" },
  { id: "gt-15", governorate: "البصرة", course_name: "دورة إدارة المشاريع", domain: "إدارية", course_hours: 12, track: "المسار الأول", nominees_count: 20, planned_start_date: "2026-04-01", planned_end_date: "2026-04-06", actual_start_date: "2026-04-01", actual_end_date: "2026-04-06", status: "completed", compliance: "on_track", notes: "", created_by: "emp-2", created_at: "2026-04-01T08:00:00Z", updated_at: "2026-04-06T14:00:00Z" },
  { id: "gt-16", governorate: "البصرة", course_name: "دورة الأمن السيبراني", domain: "تقنية المعلومات", course_hours: 15, track: "المسار الثاني", nominees_count: 25, planned_start_date: "2026-04-08", planned_end_date: "2026-04-15", actual_start_date: "2026-04-10", actual_end_date: null, status: "in_progress", compliance: "delayed", notes: "تأخر بدء الدورة يومين", created_by: "emp-2", created_at: "2026-04-08T08:00:00Z", updated_at: "2026-04-12T10:00:00Z" },
  { id: "gt-17", governorate: "البصرة", course_name: "دورة مهارات التفاوض", domain: "قيادية", course_hours: 8, track: "المسار الأول", nominees_count: 18, planned_start_date: "2026-06-01", planned_end_date: "2026-06-05", actual_start_date: null, actual_end_date: null, status: "planned", compliance: "not_started", notes: "", created_by: "emp-2", created_at: "2026-05-20T08:00:00Z", updated_at: "2026-05-20T08:00:00Z" },
];

const defaultFollowUpRecords: FollowUpRecord[] = [
  { id: "fur-1", governorate_training_id: "gt-1", governorate: "بابل", course_name: "دورة تقنية SMART", record_date: "2026-03-03", compliance_status: "on_track", notes: "سير الدورة طبيعي", recorded_by: "emp-3", recorded_by_name: "خالد عبدالله السعيد", created_at: "2026-03-03T10:00:00Z" },
  { id: "fur-2", governorate_training_id: "gt-2", governorate: "بابل", course_name: "دورة إعداد التقارير", record_date: "2026-03-10", compliance_status: "delayed", notes: "تأخر يوم بسبب عطلة رسمية", recorded_by: "emp-3", recorded_by_name: "خالد عبدالله السعيد", created_at: "2026-03-10T10:00:00Z" },
  { id: "fur-3", governorate_training_id: "gt-5", governorate: "بغداد", course_name: "دورة الإدارة الإلكترونية / الوورد", record_date: "2026-04-05", compliance_status: "delayed", notes: "تأخر بدء الدورة يومين لعدم جاهزية القاعة", recorded_by: "emp-7", recorded_by_name: "عبدالرحمن فهد الشمري", created_at: "2026-04-05T10:00:00Z" },
  { id: "fur-4", governorate_training_id: "gt-6", governorate: "بغداد", course_name: "دورة القيادة التحويلية", record_date: "2026-05-18", compliance_status: "delayed", notes: "لم يبدأ بعد رغم حلول الموعد، ينتظر تأكيد المدرب", recorded_by: "emp-7", recorded_by_name: "عبدالرحمن فهد الشمري", created_at: "2026-05-18T10:00:00Z" },
  { id: "fur-5", governorate_training_id: "gt-11", governorate: "النجف", course_name: "دورة تنمية الذكاء العاطفي", record_date: "2026-05-05", compliance_status: "delayed", notes: "تأخر يوم بسبب ظروف الطقس", recorded_by: "emp-3", recorded_by_name: "خالد عبدالله السعيد", created_at: "2026-05-05T10:00:00Z" },
  { id: "fur-6", governorate_training_id: "gt-13", governorate: "القادسية", course_name: "دورة الإدارة الإلكترونية / Excel", record_date: "2026-05-13", compliance_status: "on_track", notes: "الدورة تسير حسب الجدول", recorded_by: "emp-3", recorded_by_name: "خالد عبدالله السعيد", created_at: "2026-05-13T10:00:00Z" },
];

const defaultWeekSchedules: WeekScheduleEntry[] = [
  { id: "ws-1", governorate: "بابل", week: 1, start_date: "2026-03-01", end_date: "2026-03-07", label: "الأسبوع الأول" },
  { id: "ws-2", governorate: "بابل", week: 2, start_date: "2026-03-08", end_date: "2026-03-14", label: "الأسبوع الثاني" },
  { id: "ws-3", governorate: "بابل", week: 3, start_date: "2026-03-15", end_date: "2026-03-21", label: "الأسبوع الثالث" },
  { id: "ws-4", governorate: "بابل", week: 4, start_date: "2026-03-22", end_date: "2026-03-28", label: "الأسبوع الرابع" },
  { id: "ws-5", governorate: "بغداد", week: 1, start_date: "2026-03-15", end_date: "2026-03-21", label: "الأسبوع الأول" },
  { id: "ws-6", governorate: "بغداد", week: 2, start_date: "2026-03-22", end_date: "2026-03-28", label: "الأسبوع الثاني" },
  { id: "ws-7", governorate: "بغداد", week: 3, start_date: "2026-04-01", end_date: "2026-04-07", label: "الأسبوع الثالث" },
  { id: "ws-8", governorate: "كربلاء", week: 1, start_date: "2026-03-22", end_date: "2026-03-28", label: "الأسبوع الأول" },
  { id: "ws-9", governorate: "النجف", week: 1, start_date: "2026-04-06", end_date: "2026-04-12", label: "الأسبوع الأول" },
  { id: "ws-10", governorate: "القادسية", week: 1, start_date: "2026-03-28", end_date: "2026-04-03", label: "الأسبوع الأول" },
  { id: "ws-11", governorate: "البصرة", week: 1, start_date: "2026-04-01", end_date: "2026-04-07", label: "الأسبوع الأول" },
  { id: "ws-12", governorate: "البصرة", week: 2, start_date: "2026-04-08", end_date: "2026-04-14", label: "الأسبوع الثاني" },
];

const defaultTrainingPlanImports: TrainingPlanImport[] = [];

const defaultFollowUpNotifications: FollowUpNotification[] = [
  { id: "fun-1", governorate: "بابل", assigned_to: "emp-3", assigned_to_name: "خالد عبدالله السعيد", assigned_by: "emp-1", assigned_by_name: "أحمد محمد العلي", frequency: "weekly", active: true, notes: "متابعة أسبوعية لدورات بابل", created_at: "2026-03-01T08:00:00Z" },
  { id: "fun-2", governorate: "بغداد", assigned_to: "emp-7", assigned_to_name: "عبدالرحمن فهد الشمري", assigned_by: "emp-2", assigned_by_name: "فاطمة حسن الأمير", frequency: "weekly", active: true, notes: "متابعة أسبوعية لدورات بغداد", created_at: "2026-03-01T08:00:00Z" },
  { id: "fun-3", governorate: "كربلاء", assigned_to: "emp-5", assigned_to_name: "محمد علي الزهراني", assigned_by: "emp-1", assigned_by_name: "أحمد محمد العلي", frequency: "biweekly", active: true, notes: "متابعة نصف شهرية لكربلاء", created_at: "2026-04-01T08:00:00Z" },
  { id: "fun-4", governorate: "النجف", assigned_to: "emp-7", assigned_to_name: "عبدالرحمن فهد الشمري", assigned_by: "emp-2", assigned_by_name: "فاطمة حسن الأمير", frequency: "monthly", active: true, notes: "متابعة شهرية للنجف", created_at: "2026-04-01T08:00:00Z" },
];

const defaultProfiles: UserProfile[] = [
  { id: "emp-1", name: "أحمد محمد العلي", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مدير النظام", phone: "0501234567", roles: ["admin", "super_user"] },
  { id: "emp-2", name: "فاطمة حسن الأمير", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مدير القسم", phone: "0507654321", roles: ["dept_manager", "training_admin"] },
  { id: "emp-3", name: "خالد عبدالله السعيد", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "رئيس شعبة الإعداد", phone: "0509876543", roles: ["unit_head"] },
  { id: "emp-4", name: "نورة سعد المالكي", department: "شعبة المناهج", section: "شعبة المناهج", position: "رئيس شعبة المناهج", phone: "0502345678", roles: ["unit_head"] },
  { id: "emp-5", name: "محمد علي الزهراني", department: "شعبة المناهج", section: "شعبة المناهج", position: "مدرب أول", phone: "0503456789", roles: ["trainer"] },
  { id: "emp-6", name: "سارة يوسف القحطاني", department: "الإدارة العامة", section: "الأرشيف", position: "إدارية", phone: "0504567890", roles: ["supervisor"] },
  { id: "emp-7", name: "عبدالرحمن فهد الشمري", department: "شعبة الإعداد والتدريب", section: "شعبة الإعداد والتدريب", position: "مقيّم تدريب", phone: "0505678901", roles: ["individual"] },
  { id: "emp-8", name: "هند ماجد العتيبي", department: "المالية", section: "الميزانية", position: "محاسبة", phone: "0506789012", roles: ["individual"] },
];

export const defaultUserAccounts: UserAccount[] = [
  { email: "admin@tadreeb.sa", password: "admin123", profile: defaultProfiles[0] },
  { email: "manager@tadreeb.sa", password: "manager123", profile: defaultProfiles[1] },
  { email: "prep@tadreeb.sa", password: "prep123", profile: defaultProfiles[2] },
  { email: "curriculum@tadreeb.sa", password: "curriculum123", profile: defaultProfiles[3] },
  { email: "trainer@tadreeb.sa", password: "trainer123", profile: defaultProfiles[4] },
  { email: "supervisor@tadreeb.sa", password: "super123", profile: defaultProfiles[5] },
  { email: "user1@tadreeb.sa", password: "user123", profile: defaultProfiles[6] },
  { email: "user2@tadreeb.sa", password: "user123", profile: defaultProfiles[7] },
];

interface StoreData {
  employees: Employee[];
  courses: Course[];
  trainees: CourseTrainee[];
  hrRequests: HRRequest[];
  curriculumItems: CurriculumItem[];
  correspondence: CorrespondenceItem[];
  tasks: Task[];
  taskHandovers: TaskHandover[];
  taskComments: TaskComment[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  profiles: UserProfile[];
  userAccounts: UserAccount[];
  governorateTraining: GovernorateTraining[];
  followUpRecords: FollowUpRecord[];
  followUpNotifications: FollowUpNotification[];
  weekSchedules: WeekScheduleEntry[];
  trainingPlanImports: TrainingPlanImport[];
}

const getDefaultStore = (): StoreData => ({
  employees: defaultEmployees,
  courses: defaultCourses,
  trainees: defaultTrainees,
  hrRequests: defaultHRRequests,
  curriculumItems: defaultCurriculum,
  correspondence: defaultCorrespondence,
  tasks: defaultTasks,
  taskHandovers: defaultTaskHandovers,
  taskComments: defaultTaskComments,
  notifications: defaultNotifications,
  auditLog: defaultAuditLog,
  profiles: defaultProfiles,
  userAccounts: defaultUserAccounts,
  governorateTraining: defaultGovernorateTraining,
  followUpRecords: defaultFollowUpRecords,
  followUpNotifications: defaultFollowUpNotifications,
  weekSchedules: defaultWeekSchedules,
  trainingPlanImports: defaultTrainingPlanImports,
});

let store: StoreData | null = null;

function getStore(): StoreData {
  if (store) return store;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      store = JSON.parse(saved);
      return store!;
    }
  } catch { /* ignore parse errors */ }
  store = getDefaultStore();
  saveStore();
  return store;
}

function saveStore() {
  if (!store) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    if (getServerAvailable()) debouncedPush();
  } catch { /* ignore write errors */ }
}

export function resetStore() {
  store = getDefaultStore();
  saveStore();
}

// === CRUD helpers ===
function getAll<T>(key: keyof StoreData): T[] {
  const s = getStore();
  if (!Array.isArray(s[key])) {
    (s as unknown as Record<string, unknown>)[key as string] = [];
    saveStore();
  }
  return s[key] as T[];
}

function insertItem<T extends { id: string }>(key: keyof StoreData, item: Omit<T, "id"> & { id?: string }): T {
  const s = getStore();
  const arr = s[key] as T[];
  const newItem = { ...item, id: item.id || uid() } as T;
  arr.push(newItem);
  saveStore();
  return newItem;
}

function updateItem<T extends { id: string }>(key: keyof StoreData, id: string, updates: Partial<T>): T | null {
  const s = getStore();
  const arr = s[key] as T[];
  const idx = arr.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...updates };
  saveStore();
  return arr[idx];
}

function deleteItem<T extends { id: string }>(key: keyof StoreData, id: string): boolean {
  const s = getStore();
  const arr = s[key] as T[];
  const idx = arr.findIndex((item) => item.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  saveStore();
  return true;
}

// === Table-specific API ===
export const localDb = {
  employees: {
    getAll: () => getAll<Employee>("employees"),
    insert: (e: Partial<Employee>) => insertItem<Employee>("employees", { created_at: now(), updated_at: now(), ...e } as Employee),
    update: (id: string, u: Partial<Employee>) => updateItem<Employee>("employees", id, { updated_at: now(), ...u } as Partial<Employee>),
    delete: (id: string) => deleteItem<Employee>("employees", id),
  },
  courses: {
    getAll: () => {
      const courses = getAll<Course>("courses");
      const trainees = getAll<CourseTrainee>("trainees");
      return courses.map(c => ({ ...c, trainees: trainees.filter(t => t.course_id === c.id) }));
    },
    insert: (c: Partial<Course>) => insertItem<Course>("courses", { created_at: now(), updated_at: now(), ...c } as Course),
    update: (id: string, u: Partial<Course>) => updateItem<Course>("courses", id, { updated_at: now(), ...u } as Partial<Course>),
    delete: (id: string) => { deleteItem<CourseTrainee>("trainees", id); return deleteItem<Course>("courses", id); },
  },
  trainees: {
    getAll: () => getAll<CourseTrainee>("trainees"),
    insert: (t: Partial<CourseTrainee>) => insertItem<CourseTrainee>("trainees", { created_at: now(), ...t } as CourseTrainee),
    update: (id: string, u: Partial<CourseTrainee>) => updateItem<CourseTrainee>("trainees", id, u),
    deleteByCourse: (courseId: string) => {
      const s = getStore();
      s.trainees = s.trainees.filter(t => t.course_id !== courseId);
      saveStore();
    },
  },
  hrRequests: {
    getAll: () => getAll<HRRequest>("hrRequests"),
    insert: (r: Partial<HRRequest>) => insertItem<HRRequest>("hrRequests", {
      approval_status: "pending", unit_head_status: "pending", unit_head_by: null, unit_head_at: null,
      dept_manager_status: "pending", dept_manager_by: null, dept_manager_at: null,
      created_at: now(), updated_at: now(), ...r,
    } as HRRequest),
    update: (id: string, u: Partial<HRRequest>) => updateItem<HRRequest>("hrRequests", id, { updated_at: now(), ...u } as Partial<HRRequest>),
  },
  curriculumItems: {
    getAll: () => getAll<CurriculumItem>("curriculumItems"),
    insert: (c: Partial<CurriculumItem>) => insertItem<CurriculumItem>("curriculumItems", { created_at: now(), updated_at: now(), ...c } as CurriculumItem),
    update: (id: string, u: Partial<CurriculumItem>) => updateItem<CurriculumItem>("curriculumItems", id, { updated_at: now(), ...u } as Partial<CurriculumItem>),
  },
  correspondence: {
    getAll: () => getAll<CorrespondenceItem>("correspondence"),
    insert: (c: Partial<CorrespondenceItem>) => insertItem<CorrespondenceItem>("correspondence", { created_at: now(), updated_at: now(), ...c } as CorrespondenceItem),
    update: (id: string, u: Partial<CorrespondenceItem>) => updateItem<CorrespondenceItem>("correspondence", id, { updated_at: now(), ...u } as Partial<CorrespondenceItem>),
  },
  tasks: {
    getAll: () => getAll<Task>("tasks"),
    insert: (t: Partial<Task>) => insertItem<Task>("tasks", {
      status: "pending", handed_over: false, achievement_points: 0, is_routine: false,
      created_at: now(), updated_at: now(), ...t,
    } as Task),
    update: (id: string, u: Partial<Task>) => updateItem<Task>("tasks", id, { updated_at: now(), ...u } as Partial<Task>),
  },
  taskHandovers: {
    getAll: () => getAll<TaskHandover>("taskHandovers"),
    insert: (t: Partial<TaskHandover>) => insertItem<TaskHandover>("taskHandovers", { created_at: now(), ...t } as TaskHandover),
  },
  taskComments: {
    getAll: () => getAll<TaskComment>("taskComments"),
    insert: (c: Partial<TaskComment>) => insertItem<TaskComment>("taskComments", { created_at: now(), ...c } as TaskComment),
  },
  notifications: {
    getAll: () => getAll<Notification>("notifications"),
    insert: (n: Partial<Notification>) => insertItem<Notification>("notifications", {
      type: "info", is_read: false, date: today(), created_at: now(), user_id: null, link: null, ...n,
    } as Notification),
    update: (id: string, u: Partial<Notification>) => updateItem<Notification>("notifications", id, u),
  },
  auditLog: {
    getAll: () => getAll<AuditEntry>("auditLog"),
    insert: (e: Partial<AuditEntry>) => insertItem<AuditEntry>("auditLog", { timestamp: now(), ...e } as AuditEntry),
  },
  profiles: {
    getAll: () => getAll<UserProfile>("profiles"),
    getById: (id: string) => getAll<UserProfile>("profiles").find(p => p.id === id) || null,
    insert: (p: Partial<UserProfile>) => insertItem<UserProfile>("profiles", p as UserProfile),
    update: (id: string, u: Partial<UserProfile>) => updateItem<UserProfile>("profiles", id, u),
  },
  userAccounts: {
    getAll: () => getAll<UserAccount>("userAccounts"),
    findByEmail: (email: string) => getAll<UserAccount>("userAccounts").find(a => a.email === email) || null,
    insert: (a: UserAccount) => insertItem<UserAccount & { id: string }>("userAccounts", a as UserAccount & { id: string }),
    updateByEmail: (email: string, updates: Partial<UserAccount>) => {
      const s = getStore();
      const idx = s.userAccounts.findIndex(a => a.email === email);
      if (idx === -1) return null;
      s.userAccounts[idx] = { ...s.userAccounts[idx], ...updates };
      saveStore();
      return s.userAccounts[idx];
    },
  },
  governorateTraining: {
    getAll: () => getAll<GovernorateTraining>("governorateTraining"),
    insert: (g: Partial<GovernorateTraining>) => insertItem<GovernorateTraining>("governorateTraining", { created_at: now(), updated_at: now(), ...g } as GovernorateTraining),
    update: (id: string, u: Partial<GovernorateTraining>) => updateItem<GovernorateTraining>("governorateTraining", id, { updated_at: now(), ...u } as Partial<GovernorateTraining>),
    delete: (id: string) => deleteItem<GovernorateTraining>("governorateTraining", id),
  },
  followUpRecords: {
    getAll: () => getAll<FollowUpRecord>("followUpRecords"),
    insert: (r: Partial<FollowUpRecord>) => insertItem<FollowUpRecord>("followUpRecords", { created_at: now(), ...r } as FollowUpRecord),
  },
  followUpNotifications: {
    getAll: () => getAll<FollowUpNotification>("followUpNotifications"),
    insert: (n: Partial<FollowUpNotification>) => insertItem<FollowUpNotification>("followUpNotifications", { created_at: now(), ...n } as FollowUpNotification),
    update: (id: string, u: Partial<FollowUpNotification>) => updateItem<FollowUpNotification>("followUpNotifications", id, u),
    delete: (id: string) => deleteItem<FollowUpNotification>("followUpNotifications", id),
  },
  weekSchedules: {
    getAll: () => getAll<WeekScheduleEntry>("weekSchedules"),
    insert: (w: Partial<WeekScheduleEntry>) => insertItem<WeekScheduleEntry>("weekSchedules", w as WeekScheduleEntry),
    update: (id: string, u: Partial<WeekScheduleEntry>) => updateItem<WeekScheduleEntry>("weekSchedules", id, u),
    delete: (id: string) => deleteItem<WeekScheduleEntry>("weekSchedules", id),
    deleteByGov: (gov: string) => { const s = getStore(); s.weekSchedules = s.weekSchedules.filter(w => w.governorate !== gov); saveStore(); },
  },
  trainingPlanImports: {
    getAll: () => getAll<TrainingPlanImport>("trainingPlanImports"),
    insert: (i: Partial<TrainingPlanImport>) => insertItem<TrainingPlanImport>("trainingPlanImports", i as TrainingPlanImport),
    delete: (id: string) => deleteItem<TrainingPlanImport>("trainingPlanImports", id),
  },
};
