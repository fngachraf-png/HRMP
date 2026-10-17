// FWMS — توليد تقرير (SPEC §4.4.1): التوليد في الخادم + تسجيل كل تصدير + الثبات
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AccessError } from "@/lib/rbac";
import { generateReport, requireSession, ReportDataError } from "@/lib/reports/generate";
import { isReportFormat, isReportKind } from "@/lib/reports/types";
import { isLocale } from "@/i18n/config";

const generateSchema = z.object({
  kind: z.string().refine(isReportKind, "bad_kind"),
  targetId: z.string().min(1).max(64),
  format: z.string().refine(isReportFormat, "bad_format"),
  language: z.string().refine(isLocale, "bad_language"),
  includeEmployerShare: z.boolean().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const origin = req.nextUrl.origin;
    const result = await generateReport(session, parsed.data, origin);
    return NextResponse.json(
      { ...result, downloadUrl: `/api/reports/${result.id}/download` },
      { status: result.reused ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ReportDataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const status = (error as { status?: number }).status;
    if (typeof status === "number") {
      return NextResponse.json({ error: (error as Error).message }, { status });
    }
    console.error("[reports/generate:POST]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
