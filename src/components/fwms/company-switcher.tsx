"use client";

// FWMS — مبدّل الشركة النشطة (SPEC §3.1): صريح ومسجَّل في التدقيق — يظهر فقط لمن له أكثر من عضوية
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";

export type CompanyOption = { id: string; legalName: string };

export function CompanySwitcher({
  companies,
  activeId,
}: {
  companies: CompanyOption[];
  activeId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (companies.length <= 1) {
    // شركة واحدة: عرض ثابت بلا تبديل
    const only = companies[0];
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Building2 className="size-4 text-primary" aria-hidden />
        <span className="max-w-48 truncate">{only?.legalName ?? t("dashboard.activeCompany")}</span>
      </div>
    );
  }

  async function switchTo(companyId: string) {
    if (companyId === activeId) return;
    await fetch("/api/auth/switch-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    }).catch(() => null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="size-4 text-primary" aria-hidden />
      <Select value={activeId} onValueChange={switchTo} disabled={isPending}>
        <SelectTrigger className="w-44 font-medium sm:w-56" aria-label={t("dashboard.switchCompany")}>
          <SelectValue placeholder={t("dashboard.activeCompany")} />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id} className="max-w-56 truncate">
              {c.legalName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden />}
    </div>
  );
}
