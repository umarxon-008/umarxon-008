// ─── NeuraMed Type Definitions ────────────────────────────────────────────────

// ── Medication ────────────────────────────────────────────────────────────────

export interface MedicationInfo {
  drug_name: string;
  generic_name: string;
  brand_names: string[];
  form: string; // tabletka, sirop, in'ektsiya...
  purpose: string;
  how_to_take: string;
  timing: string;
  food_rule: "ovqat_bilan" | "bosh_qorin" | "ahamiyatsiz";
  food_rule_note: string;
  frequency: string; // "kuniga 3 marta"
  dosage: string; // "500 mg"
  missed_dose: string;
  common_side_effects: string[];
  serious_warnings: string[];
  avoid_with: string[]; // boshqa dorilar
  lifestyle_warnings: {
    alcohol: string | null;
    pregnancy: string | null;
    breastfeeding: string | null;
    driving: string | null;
    liver: string | null;
    kidney: string | null;
  };
  when_to_call_doctor: string[];
  disclaimer: string;
  source: MedicationSource;
  /** Server tomonidan tekshiriladi: manba URL va sana mavjudmi */
  source_verified?: boolean;
  /** AI soddalashtirganmi yoki rasmiy matndan to'g'ridan-to'g'ri olinganmi */
  generated_by?: "ai" | "label_extract";
  /** Asl rasmiy label bo'limlari (tekshirish uchun) */
  official_sections?: { title: string; text: string }[];
}

export interface PersonalSafetyAlert {
  level: "danger" | "warning" | "info";
  title: string;
  description: string;
}

export interface AssistantAIResult {
  summary: string;
  key_points: string[];
  warnings: string[];
  next_steps: string[];
  questions_for_doctor: string[];
  disclaimer: string;
  source: { provider: string; url?: string; last_updated: string };
}

export interface MedicationSource {
  provider: "DailyMed" | "openFDA";
  setid?: string;
  url: string;
  last_updated: string;
}

export interface MedicationSearchResult {
  rxcui: string;
  name: string;
  genericName?: string;
  form?: string;
  tty?: string; // term type
}

// ── Lab Report ────────────────────────────────────────────────────────────────

export interface LabMarker {
  name: string; // "Hemoglobin"
  uzbekName?: string; // "Gemoglobin"
  value: number | string;
  unit: string;
  normalRange: {
    min?: number;
    max?: number;
    text: string; // "12.0-16.0 g/dL"
  };
  status: "low" | "normal" | "high" | "unknown";
  statusLabel: string; // "Past", "Normal", "Yuqori"
  isUrgent: boolean;
  explanation?: string;
  doctorQuestion?: string;
}

export interface LabReportAIResult {
  summary: string;
  markers: LabMarker[];
  key_points: string[];
  warnings: string[];
  urgent_markers: string[];
  next_steps?: string[];
  questions_for_doctor: string[];
  disclaimer: string;
  source: { provider: string; url?: string; last_updated: string };
}

// ── Imaging Report ────────────────────────────────────────────────────────────

export interface ImagingTermExplanation {
  term: string;
  simple_explanation: string;
  context?: string;
}

export interface ImagingReportAIResult {
  summary: string;
  terms_explained: ImagingTermExplanation[];
  key_findings: string[];
  warnings?: string[];
  questions_for_doctor: string[];
  next_steps: string[];
  disclaimer: string;
  source?: { provider: string; url?: string; last_updated: string };
}

// ── Doctor Visit Prep ─────────────────────────────────────────────────────────

export interface DoctorVisitInput {
  symptoms: string[];
  duration: string;
  hasTemperature: boolean;
  temperatureValue?: string;
  allergies: string[];
  currentMedications: string[];
  chronicConditions: string[];
  pregnancyNote?: string;
}

export interface DoctorVisitAIResult {
  summary: string;
  symptoms_list: string[];
  questions_for_doctor: string[];
  documents_to_bring: string[];
  urgency_level: "low" | "medium" | "high" | "emergency";
  urgency_note: string;
  emergency_signs?: string[];
  preparation_tips?: string[];
  disclaimer: string;
}

// ── Reminder ──────────────────────────────────────────────────────────────────

export interface ReminderSchedule {
  time: string; // "08:00"
  label: string; // "Ertalab"
}

export type FoodRule = "ovqat_bilan" | "bosh_qorin" | "ahamiyatsiz";
export type NotificationTypeClient = "push" | "alarm" | "both";

export interface ReminderWithMed {
  id: string;
  medicationName: string;
  dose: string;
  timesPerDay: number;
  schedule: ReminderSchedule[];
  foodRule: FoodRule;
  startDate: string;
  endDate?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  notificationType: NotificationTypeClient;
  notes?: string;
}

export interface DoseLogEntry {
  id: string;
  reminderId: string;
  scheduledAt: string;
  status: "TAKEN" | "SKIPPED" | "POSTPONED";
  takenAt?: string;
  note?: string;
}

// ── User / Profile ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  heightCm?: number;
  weightKg?: number;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pregnancyStatus:
    | "NOT_APPLICABLE"
    | "PREGNANT"
    | "BREASTFEEDING"
    | "PLANNING";
  emergencyContact?: { name: string; phone: string };
  language: "uz" | "ru" | "en";
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
