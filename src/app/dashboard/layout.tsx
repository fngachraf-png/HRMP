import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/fwms/dashboard-sidebar";
import { CompanySwitcher } from "@/components/fwms/company-switcher";
import { LogoutButton } from "@/components/fwms/logout-button";
import { LangSwitcher } from "@/components/fwms/lang-switcher";
import { NotificationBell } from "@/components/fwms/notification-bell";
import { getPlatformBranding, parseModules, isModuleEnabled, MODULE_KEYS } from "@/lib/branding";

/** مفاتيح عناصر الشريط الجانبي التي تحكمها وحدة مالك المنصة (white-label — SPEC §3.2) */
const NAV_MODULE_OF: Record<string, string> = {
  shiftTemplates: "module.scheduling",
  shifts: "module.scheduling",
  recurrences: "module.scheduling",
  mySchedule: "module.scheduling",
  attendance: "module.attendance",
  myAttendance: "module.attendance",
  coverage: "module.coverage",
  payroll: "module.payroll",
  payrollWorkers: "module.payroll",
  regimes: "module.payroll",
  declarations: "module.declarations",
  declarationSpecs: "module.declarations",
  reports: "module.reports",
  myPayslips: "module.reports",
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // حارس الوصول: لا لوحة بلا جلسة سارية (SPEC §3: التحقق في الخادم دائمًا)
  const session = await getSession();
  if (!session) redirect("/login");

  // عضويات المستخدم السارية للشركات النشطة (للتبديل الصريح — SPEC §3.1)
  const memberships = await db.userMembership.findMany({
    where: { userId: session.sub, revokedAt: null, company: { status: "active" } },
    include: { company: { select: { id: true, legalName: true, status: true } } },
    orderBy: { isDefault: "desc" },
  });
  const companies = memberships.map((m) => ({ id: m.company.id, legalName: m.company.legalName }));

  // هوية المالك + تفعيل الوحدات (white-label — SPEC §3.2): تُمرَّر للشريط الجانبي
  const branding = await getPlatformBranding();
  const modules = parseModules(branding.modulesJson);
  const hiddenKeys = MODULE_KEYS.filter((k) => !isModuleEnabled(modules, k))
    .flatMap((k) => Object.entries(NAV_MODULE_OF).filter(([, mod]) => mod === k).map(([nav]) => nav));

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <DashboardSidebar role={session.role} brandName={branding.displayName} hiddenKeys={hiddenKeys} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md sm:px-5">
          <CompanySwitcher companies={companies} activeId={session.companyId} />
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* المرحلة 5: جرس الإشعارات — لكل مستخدم (self.view) — استطلاع 20ث/120ث */}
            <NotificationBell />
            <LangSwitcher />
            <div className="hidden items-center gap-2 text-end sm:flex">
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-foreground">{session.name}</span>
                <span className="text-[11px] text-muted-foreground" dir="ltr">
                  {session.email}
                </span>
              </div>
            </div>
            <LogoutButton variant="secondary" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
