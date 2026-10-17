"use client";

// FWMS — الشريط الجانبي للوحة: عناصر بحسب صلاحيات الدور (SPEC §3) — الوحدات غير المنجزة تظهر «قريبًا» بصدق
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  ScrollText,
  CalendarClock,
  CalendarCheck,
  ClipboardCheck,
  LayoutTemplate,
  Repeat,
  MapPin,
  FolderKanban,
  GitBranch,
  Building2,
  Calculator,
  FileText,
  Settings,
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
  CalendarDays,
  ReceiptText,
  Layers,
  FileCog,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FwmsLogo } from "@/components/fwms/logo";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export type NavItem = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  href?: string;
  soon?: boolean;
};

const ALL_ITEMS: NavItem[] = [
  { key: "overview", labelKey: "dashboard.overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "companies", labelKey: "dashboard.companies", icon: Building2, href: "/dashboard/companies" },
  { key: "branches", labelKey: "dashboard.branches", icon: GitBranch, href: "/dashboard/branches" },
  { key: "projects", labelKey: "dashboard.projects", icon: FolderKanban, href: "/dashboard/projects" },
  { key: "sites", labelKey: "dashboard.sites", icon: MapPin, href: "/dashboard/sites" },
  { key: "groups", labelKey: "dashboard.groups", icon: UsersRound, href: "/dashboard/groups" },
  { key: "shiftTemplates", labelKey: "dashboard.shiftTemplates", icon: LayoutTemplate, href: "/dashboard/shift-templates" },
  { key: "shifts", labelKey: "dashboard.shifts", icon: CalendarClock, href: "/dashboard/shifts" },
  { key: "recurrences", labelKey: "dashboard.recurrences", icon: Repeat, href: "/dashboard/shift-recurrences" },
  { key: "mySchedule", labelKey: "dashboard.mySchedule", icon: CalendarCheck, href: "/dashboard/my-schedule" },
  { key: "myAttendance", labelKey: "dashboard.myAttendance", icon: ClipboardCheck, href: "/dashboard/my-attendance" },
  { key: "attendance", labelKey: "dashboard.attendance", icon: UserCheck, href: "/dashboard/attendance" },
  { key: "coverage", labelKey: "dashboard.coverage", icon: ArrowLeftRight, href: "/dashboard/coverage" },
  { key: "verificationPolicies", labelKey: "dashboard.verificationPolicies", icon: ShieldCheck, href: "/dashboard/verification-policies" },
  { key: "payroll", labelKey: "dashboard.payroll", icon: Calculator, href: "/dashboard/payroll" },
  { key: "regimes", labelKey: "dashboard.regimes", icon: Layers, href: "/dashboard/regimes" },
  { key: "declarationSpecs", labelKey: "dashboard.declarationSpecs", icon: FileCog, href: "/dashboard/declaration-specs" },
  { key: "declarations", labelKey: "dashboard.declarations", icon: Landmark, href: "/dashboard/declarations" },
  { key: "holidays", labelKey: "dashboard.holidays", icon: CalendarDays, href: "/dashboard/holidays" },
  { key: "platform", labelKey: "dashboard.platform", icon: Landmark, href: "/dashboard/platform" },
  { key: "myPayslips", labelKey: "dashboard.myPayslips", icon: ReceiptText, href: "/dashboard/my-payslips" },
  { key: "users", labelKey: "dashboard.users", icon: Users, soon: true },
  { key: "reports", labelKey: "dashboard.reports", icon: FileText, href: "/dashboard/reports" },
  { key: "audit", labelKey: "dashboard.audit", icon: ScrollText, soon: true },
  { key: "settings", labelKey: "dashboard.settings", icon: Settings, soon: true },
];

export function DashboardSidebar({
  role,
  brandName,
  hiddenKeys = [],
}: {
  role: string;
  brandName?: string; // اسم مالك المنصة (white-label — SPEC §3.2) — من الخادم
  hiddenKeys?: string[]; // عناصر وحدات عطّلها المالك (تفعيل/تعطيل الوحدات — SPEC §3.2)
}) {
  const { t } = useI18n();
  const pathname = usePathname();

  // إظهار العناصر بحسب الدور (SPEC §3): العامل يرى الأساسيات وبرنامجه وحضوره وأجوره فقط
  // المرحلة 6أ/6ب: «الأجور» لمن يملك payroll.view (مدير/محاسب/مالك) — «أجوري» للجميع (self.view)
  // «العطل الرسمية» لمستخدمي الأجور (إدخالها admin) — co_admin بلا أرقام أجور (SPEC §4.4.1)
  // المرحلة 6ج (SPEC §12 و§4.6): المسارات لمستخدمي الأجور — المواصفات والتصاريح للمحاسب/المالك حصرًا
  const visibleKeys: Record<string, string[]> = {
    super_admin: ["overview", "companies", "branches", "projects", "sites", "groups", "shiftTemplates", "shifts", "recurrences", "mySchedule", "myAttendance", "attendance", "coverage", "verificationPolicies", "payroll", "regimes", "declarationSpecs", "declarations", "holidays", "platform", "myPayslips", "users", "reports", "audit", "settings"],
    accountant: ["overview", "mySchedule", "myAttendance", "payroll", "regimes", "declarationSpecs", "declarations", "holidays", "myPayslips", "reports", "audit"],
    admin: ["overview", "branches", "projects", "sites", "groups", "shiftTemplates", "shifts", "recurrences", "mySchedule", "myAttendance", "attendance", "coverage", "verificationPolicies", "payroll", "regimes", "holidays", "myPayslips", "users", "reports", "audit", "settings"],
    co_admin: ["overview", "shiftTemplates", "shifts", "recurrences", "mySchedule", "myAttendance", "attendance", "coverage", "myPayslips", "reports"],
    employee: ["overview", "mySchedule", "myAttendance", "myPayslips", "reports"],
  };
  const keys = visibleKeys[role] ?? ["overview"];
  const items = ALL_ITEMS.filter((i) => keys.includes(i.key) && !hiddenKeys.includes(i.key));

  return (
    <aside className="flex w-full shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-64">
      {/* الهوية */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
        <FwmsLogo className="size-8" />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-extrabold tracking-tight">{brandName ?? "FWMS"}</span>
          <span className="text-[11px] text-sidebar-foreground/70">{t("dashboard.title")}</span>
        </div>
      </div>

      {/* التنقل */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="dashboard">
        {items.map((item) => {
          const active = item.href !== undefined && pathname === item.href;
          const content = (
            <>
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate text-sm">{t(item.labelKey)}</span>
              {item.soon && (
                <Badge
                  variant="secondary"
                  className="ms-1 h-5 px-1.5 text-[10px] font-semibold text-sidebar-accent-foreground"
                >
                  {t("dashboard.comingSoon")}
                </Badge>
              )}
            </>
          );
          const baseClass = cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/85 transition-colors",
            active
              ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
              : item.soon
                ? "cursor-default opacity-60"
                : "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
          );
          return item.href && !item.soon ? (
            <Link key={item.key} href={item.href} className={baseClass} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          ) : (
            <span key={item.key} className={baseClass} aria-disabled="true">
              {content}
            </span>
          );
        })}
      </nav>

      {/* نسخة المرحلة */}
      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
        <span dir="ltr">v0.8.0 — Phase 7</span>
      </div>
    </aside>
  );
}
