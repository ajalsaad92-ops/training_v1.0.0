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

const defaultEmployees = SEED_EMPLOYEES;
const defaultCourses = SEED_COURSES;
const defaultTrainees = SEED_TRAINEES;
const defaultHRRequests = SEED_HR;
const defaultCurriculum = SEED_CURRICULUM;
const defaultCorrespondence = SEED_CORRESPONDENCE;
const defaultTasks = SEED_TASKS;
const defaultNotifications = SEED_NOTIFICATIONS;
const defaultAuditLog = SEED_AUDIT_LOG;
const defaultTaskHandovers: TaskHandover[] = [];
const defaultTaskComments: TaskComment[] = [];
const defaultGovernorateTraining = SEED_GOV_TRAINING;
const defaultFollowUpRecords = SEED_FOLLOWUP_RECORDS;
const defaultWeekSchedules = SEED_WEEK_SCHEDULES;
const defaultTrainingPlanImports: TrainingPlanImport[] = [];
const defaultFollowUpNotifications = SEED_FOLLOWUP_NOTIFS;
const defaultProfiles = SEED_PROFILES;
export const defaultUserAccounts = SEED_USER_ACCOUNTS;



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
    const currentVer = localStorage.getItem(SEED_VERSION_KEY);
    if (currentVer !== SEED_VERSION) {
      // Force re-seed with fresh data
      store = getDefaultStore();
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      saveStore();
      return store;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      store = JSON.parse(saved);
      return store!;
    }
  } catch { /* ignore parse errors */ }
  store = getDefaultStore();
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
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
