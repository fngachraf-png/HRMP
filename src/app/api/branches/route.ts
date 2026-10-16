// FWMS — الفروع (SPEC §5 و§8 — المرحلة 2): قائمة وإنشاء مع عزل الشركة وتدقيق
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requirePermission, AccessError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { branchCreateSchema, emptyToNull } from "@/lib/organization";

export async function GET() {
  try {
    const session = await getSession();
    requirePermission(session, "company.manage");

    const branches = await db.branch.findMany({
      where: { companyId: session!.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { sites: { where: { status: "active" } } } },
      },
    });

    return NextResponse.json({
      count: branches.length,
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        city: b.city,
        address: b.address,
        status: b.status,
        createdAt: b.createdAt,
        activeSites: b._count.sites,
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[branches]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    requirePermission(session, "company.manage");

    const parsed = branchCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const branch = await db.branch.create({
      data: {
        companyId: session!.companyId, // من الجلسة لا من العميل (SPEC §3.1)
        name: parsed.data.name,
        code: emptyToNull(parsed.data.code),
        city: emptyToNull(parsed.data.city),
        address: emptyToNull(parsed.data.address),
      },
    });

    await writeAudit({
      companyId: session!.companyId,
      userId: session!.sub,
      action: "branch.create",
      entity: "branch",
      entityId: branch.id,
      after: { name: branch.name, code: branch.code, city: branch.city },
    });

    return NextResponse.json(
      {
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          city: branch.city,
          status: branch.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[branches]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
