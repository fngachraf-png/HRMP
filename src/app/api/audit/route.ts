// FWMS — سجل التدقيق (SPEC §3): يقرؤه من يملك audit.view — مقيّد بالشركة النشطة
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requirePermission, AccessError } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "audit.view");

    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 200);

    // super_admin يرى كل الشركات؛ غيره شركته النشطة فقط (عزل 3.1)
    const where =
      session!.role === "super_admin" ? {} : { companyId: session!.companyId };

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { fullName: true, email: true } },
        company: { select: { legalName: true } },
      },
    });

    return NextResponse.json({
      count: logs.length,
      logs: logs.map((l) => ({
        id: l.id,
        at: l.createdAt,
        action: l.action,
        actor: l.user?.fullName ?? "system",
        company: l.company?.legalName ?? null,
        entity: l.entity,
        entityId: l.entityId,
        reason: l.reason,
        ip: l.ip,
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[audit]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
