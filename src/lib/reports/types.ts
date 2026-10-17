// FWMS — أنواع محرك التقارير والتصدير (SPEC §4.4.1 — المرحلة 7)
// التوليد في الخادم دائمًا (نفس الناتج في كل مكان) | المبالغ Int بالسنتيم كما هي مخزَّنة
// المستند المعتمد يُبنى من snapshotJson المجمدة — لا يُعاد حساب شيء

import type { Locale } from "../../i18n/config";

// ─── الأنواع العامة ───────────────────────────────────────────

export const REPORT_KINDS = [
  "payslip",
  "payroll_summary",
  "attendance_statement",
  "hours_statement",
  "declarations_summary",
  "compliance_report",
  "platform_summary",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_FORMATS = ["pdf", "docx", "png"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export type ReportLanguage = Locale; // ar | fr | en | es

/** الصيغ المسموحة لكل نوع — PNG «للقسيمة والملخصات القصيرة فقط» (SPEC §4.4.1) */
export const KIND_FORMATS: Record<ReportKind, ReportFormat[]> = {
  payslip: ["pdf", "docx", "png"],
  payroll_summary: ["pdf", "docx"],
  attendance_statement: ["pdf", "docx"],
  hours_statement: ["pdf", "docx"],
  declarations_summary: ["pdf", "docx"],
  compliance_report: ["pdf", "docx"],
  platform_summary: ["pdf", "docx", "png"],
};

export function isReportKind(v: unknown): v is ReportKind {
  return typeof v === "string" && (REPORT_KINDS as readonly string[]).includes(v);
}
export function isReportFormat(v: unknown): v is ReportFormat {
  return typeof v === "string" && (REPORT_FORMATS as readonly string[]).includes(v);
}

/** خيارات التوليد — تُخزَّن optionsJson مع المستند (قابلة للتدقيق) */
export type ReportOptions = {
  includeEmployerShare?: boolean; // حصة المشغّل: افتراضيًا تُخفى عن العامل (SPEC §4.4.1)
};

// ─── نماذج بيانات المستندات (من snapshotJson المجمدة) ─────────

/** صف بند في جدول البنود */
export type ReportLine = {
  kind: string; // نفس أنواع PayslipLine
  label?: string | null; // تسمية البنود اليدوية
  minutes: number | null;
  rateBp: number | null;
  amountCents: number;
  reason?: string | null;
};

/** ترويسة العامل في القسيمة */
export type ReportWorker = {
  fullName: string;
  cin: string | null;
  cnssNumber: string | null;
  payType: string; // hourly | daily | monthly
  dependentsCount: number;
};

export type ReportCompany = {
  legalName: string;
  tradeName: string | null;
  taxId: string | null; // ICE
  cnssNumber: string | null;
  currency: string; // MAD
};

/** بيانات قسيمة الأجر — كل المبالغ من snapshotJson للكشف المعتمد */
export type PayslipReportData = {
  kind: "payslip";
  payslipId: string;
  refNumber: string; // PS-YYYYMM-NNNN
  periodLabel: string; // "2026-10"
  periodStatus: string;
  frozenAt: string | null;
  company: ReportCompany;
  worker: ReportWorker;
  totals: {
    workedMinutes: number;
    breakMinutes: number;
    overtimeMinutes: number;
    workedDays: number;
    grossCents: number;
    cnssEmployeeCents: number;
    amoEmployeeCents: number;
    irNetCents: number;
    netCents: number;
    employerCostCents: number;
    totalCostCents: number;
  };
  lines: ReportLine[];
  smigBreached: boolean;
};

/** صف عامل في ملخص الفترة */
export type SummaryWorkerRow = {
  fullName: string;
  refNumber: string;
  workedMinutes: number;
  overtimeMinutes: number;
  grossCents: number;
  cnssEmployeeCents: number;
  amoEmployeeCents: number;
  irNetCents: number;
  netCents: number;
};

/** بيانات ملخص أجور الفترة (المدير/المحاسب — كشف الشركة الكامل) */
export type PayrollSummaryReportData = {
  kind: "payroll_summary";
  periodId: string;
  periodLabel: string;
  periodStatus: string;
  company: ReportCompany;
  workersCount: number;
  totals: {
    workedMinutes: number;
    overtimeMinutes: number;
    grossCents: number;
    sbiCents: number;
    cnssEmployeeCents: number;
    amoEmployeeCents: number;
    irNetCents: number;
    netCents: number;
    employerCostCents: number;
    totalCostCents: number;
  };
  rows: SummaryWorkerRow[];
};

/** صف يوم في بيان الحضور */
export type AttendanceRow = {
  localDate: string; // YYYY-MM-DD
  inLabel: string | null; // HH:MM محلي أو null
  outLabel: string | null;
  minutes: number; // صافي مدة اليوم (دقائق) — 0 بلا حضور
  status: "done" | "partial" | "absent";
};

/** بيانات بيان الحضور/الساعات (بلا أي رقم أجر — للمشرف والعامل) */
export type AttendanceReportData = {
  kind: "attendance_statement" | "hours_statement";
  targetUserId: string;
  workerName: string;
  rangeLabel: string; // "2026-10"
  company: ReportCompany;
  rows: AttendanceRow[];
  totals: { days: number; presentDays: number; totalMinutes: number; lateCount: number };
};

/** بيانات ملخص التصاريح (المحاسب) */
export type DeclarationsSummaryReportData = {
  kind: "declarations_summary";
  company: ReportCompany;
  periodLabel: string; // آخر فترة أو "—"
  rows: {
    authority: string; // cnss | dgi
    kind: string; // monthly | annual_9421 | ...
    periodKey: string;
    status: string;
    grossCents: number | null;
    irNetCents: number | null;
    netCents: number | null;
    specVersion: number | null;
    exportedAt: string | null;
  }[];
};

/** بيانات تقرير المطابقة (SPEC §4.6: مع كل تصريح — كشوف معتمدة ↔ الملف الرسمي) */
export type ComplianceReportData = {
  kind: "compliance_report";
  declarationId: string;
  declarationLabel: string; // "CNSS شهري 2026-10"
  authority: string;
  status: string;
  company: ReportCompany;
  periodLabel: string | null;
  payslipTotals: {
    workers: number;
    grossCents: number;
    cnssBaseCents: number;
    cnssEmployeeCents: number;
    amoEmployeeCents: number;
    irNetCents: number;
    netCents: number;
  };
  declarationTotals: {
    workers: number | null;
    grossCents: number | null;
    cnssEmployeeCents: number | null;
    amoEmployeeCents: number | null;
    irNetCents: number | null;
    netCents: number | null;
  };
  diffs: { field: string; payslipCents: number; declarationCents: number | null; diffCents: number }[];
  fileHash: string | null;
  specVersion: number | null;
};

/** بيانات ملخص المنصة (super_admin — عبر الشركات، بلا أسماء عمال) */
export type PlatformSummaryReportData = {
  kind: "platform_summary";
  companiesCount: number;
  activeCompaniesCount: number;
  rows: {
    legalName: string;
    workersCount: number;
    approvedPeriods: number;
    payslipsCount: number;
    netCents: number;
    totalCostCents: number;
    lastApprovedLabel: string | null;
  }[];
};

export type AnyReportData =
  | PayslipReportData
  | PayrollSummaryReportData
  | AttendanceReportData
  | DeclarationsSummaryReportData
  | ComplianceReportData
  | PlatformSummaryReportData;

/** المخرج الموحّد من المولِّد */
export type GeneratedFile = {
  bytes: Uint8Array;
  hash: string; // SHA-256 hex
  size: number;
  contentType: string;
  fileName: string; // آمن ASCII
};
