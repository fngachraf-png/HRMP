// FWMS — تعديل مجموعة/أرشفتها/استعادتها: عزل الشركة + تدقيق قبل/بعد
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requirePermission, AccessError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { groupUpdateSchema, emptyToNull, entityIdSchema } from "@/lib/organization";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "company.manage");

    const { id } = await params;
    if (!entityIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const parsed = groupUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const group = await db.workerGroup.findFirst({
      where: { id, companyId: session!.companyId },
    });
    if (!group) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = parsed.data;
    const updated = await db.workerGroup.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description !== undefined ? emptyToNull(data.description) : undefined,
        status: data.status ?? undefined,
      },
    });

    const action =
      data.status === "archived"
        ? "worker_group.archive"
        : data.status === "active" && group.status === "archived"
          ? "worker_group.restore"
          : "worker_group.update";

    await writeAudit({
      companyId: session!.companyId,
      userId: session!.sub,
      action,
      entity: "worker_group",
      entityId: group.id,
      before: { name: group.name, status: group.status },
      after: { name: updated.name, status: updated.status },
    });

    return NextResponse.json({
      group: { id: updated.id, name: updated.name, status: updated.status },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[worker-groups/:id]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// الحذف = أرشفة (SPEC §11.7)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    requirePermission(session, "company.manage");

    const { id } = await params;
    if (!entityIdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const group = await db.workerGroup.findFirst({
      where: { id, companyId: session!.companyId },
    });
    if (!group) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (group.status === "archived") {
      return NextResponse.json({ ok: true, already: true });
    }

    const updated = await db.workerGroup.update({
      where: { id },
      data: { status: "archived" },
    });

    await writeAudit({
      companyId: session!.companyId,
      userId: session!.sub,
      action: "worker_group.archive",
      entity: "worker_group",
      entityId: group.id,
      before: { name: group.name, status: group.status },
      after: { name: updated.name, status: updated.status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[worker-groups/:id]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
