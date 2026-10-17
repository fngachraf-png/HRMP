// FWMS — سحب منحة محاسب خارجي (SPEC §3.3: قابلة للسحب)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requirePermission, AccessError } from "@/lib/rbac";
import { revokeGrant } from "@/lib/declarations/service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    requirePermission(session, "users.manage");
    const grant = await revokeGrant(session!, id);
    return NextResponse.json(grant);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const status = (error as { status?: number }).status;
    if (typeof status === "number") {
      return NextResponse.json({ error: (error as Error).message }, { status });
    }
    console.error("[accountant-grants/[id]:DELETE]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
