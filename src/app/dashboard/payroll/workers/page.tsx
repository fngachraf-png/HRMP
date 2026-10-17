import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { getDictionary, tServer } from "@/i18n/get-dictionary";
import { WorkerPaySettings } from "@/components/fwms/worker-pay-settings";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const dict = getDictionary(resolveLocale(store.get(LOCALE_COOKIE)?.value));
  return { title: tServer(dict, "payroll.workersTitle") };
}

export default async function PayrollWorkersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // إعداد ملفات الأجور للمدير حصرًا (payroll.approve — SPEC §4.3 هيكل الأجور إدارة)
  if (!sessionCan(session, "payroll.approve")) redirect("/dashboard/payroll");

  return <WorkerPaySettings />;
}
