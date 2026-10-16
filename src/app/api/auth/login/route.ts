// FWMS — تسجيل الدخول (SPEC §6): تحقق خادمي، تسجيل في التدقيق، ثم جلسة بشركة نشطة
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession, requestMeta, setSessionCookie } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    // رسالة واحدة للخطأين كي لا يُكشف وجود الحساب (SPEC §6)
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      await writeAudit({
        action: "auth.login.failed",
        entity: "user",
        entityId: user?.id ?? parsed.data.email,
      });
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    if (!user.isActive) {
      await writeAudit({ userId: user.id, action: "auth.login.blocked", entity: "user", entityId: user.id });
      return NextResponse.json({ error: "account_inactive" }, { status: 403 });
    }

    // العضوية الافتراضية (أو الأولى السارية) — الجلسة بشركة نشطة واحدة (SPEC §3.1)
    const membership =
      (await db.userMembership.findFirst({
        where: { userId: user.id, revokedAt: null, isDefault: true, company: { status: "active" } },
      })) ??
      (await db.userMembership.findFirst({
        where: { userId: user.id, revokedAt: null, company: { status: "active" } },
      }));

    if (!membership) {
      return NextResponse.json({ error: "no_active_membership" }, { status: 403 });
    }

    const token = await issueSession({
      sub: user.id,
      membershipId: membership.id,
      companyId: membership.companyId,
      role: membership.role,
    });
    await setSessionCookie(token);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const meta = await requestMeta();
    await writeAudit({
      companyId: membership.companyId,
      userId: user.id,
      action: "auth.login",
      entity: "user",
      entityId: user.id,
      reason: `ip=${meta.ip ?? "unknown"}`,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.fullName, email: user.email },
      company: { id: membership.companyId },
      role: membership.role,
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
