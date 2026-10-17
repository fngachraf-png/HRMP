// FWMS — التحكم بالوصول القائم على الأدوار (SPEC §3)
// الطبقة الوحيدة للتحقق من الصلاحيات في الخادم — قابلة للاختبار، لا تُكرَّر في الواجهات
import type { SessionPayload } from "@/lib/auth/jwt";

export const ROLES = ["super_admin", "accountant", "admin", "co_admin", "employee"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** الصلاحيات المنطقية للمنصة — تُوسَّع مع المراحل التالية */
export const PERMISSIONS = [
  "platform.manage", // إدارة الشركات والمالك وإعدادات النظام
  "company.manage", // إدارة فروع/مواقع/مشاريع الشركة
  "users.manage", // إدارة مستخدمي الشركة
  "payroll.view", // عرض كشوف الأجور
  "payroll.approve", // اعتماد كشوف الأجور النهائية
  "payroll.verify", // توثيق قواعد الأجور (المحاسب — المرحلة 6أ/6ب: يمنع الاعتماد قبلها)
  "declarations.review", // مراجعة/اعتماد ملفات التصريح (CNSS/DGI)
  "declarations.export", // تصدير الملفات الرسمية
  "audit.view", // عرض سجل التدقيق
  "attendance.manage", // مراجعة الحضور وتعديلات الطوارئ
  "scheduling.manage", // تعيين البرامج اليومية
  "self.view", // بيانات المستخدم نفسه فقط
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** مصفوفة الأدوار ← الصلاحيات (SPEC §3) */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...PERMISSIONS],
  accountant: [
    "payroll.view",
    "payroll.verify",
    "declarations.review",
    "declarations.export",
    "audit.view",
    "self.view",
  ],
  admin: [
    "company.manage",
    "users.manage",
    "payroll.view",
    "payroll.approve",
    "audit.view",
    "attendance.manage",
    "scheduling.manage",
    "self.view",
  ],
  co_admin: ["attendance.manage", "scheduling.manage", "self.view"],
  employee: ["self.view"],
};

export function roleHas(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function sessionCan(session: SessionPayload | null, permission: Permission): boolean {
  if (!session) return false;
  return roleHas(session.role, permission);
}

/** حرّاس الوصول للمسارات الخادمية — ترمي استثناء يُحوَّل إلى 401/403 في الـ API */
export class AccessError extends Error {
  status: number;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export function requirePermission(
  session: SessionPayload | null,
  permission: Permission
): SessionPayload {
  if (!session) throw new AccessError(401, "unauthenticated");
  if (!sessionCan(session, permission)) throw new AccessError(403, "forbidden");
  return session;
}
