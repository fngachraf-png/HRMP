// FWMS — رموز JWT للجلسات (jose): قصيرة العمر، توقّع HS256
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "FWMS_SESSION";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 ساعة (SPEC §6: JWT قصير العمر)

export type SessionPayload = {
  sub: string; // userId
  email: string;
  name: string;
  membershipId: string;
  companyId: string;
  role: string;
  locale: string;
  issuedAt: number; // ثوانٍ Unix — يُقارن مع sessionsInvalidatedAt عند التحقق
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET مفقود أو قصير جدًا — راجع .env.example");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("fwms")
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { issuer: "fwms" });
    if (
      typeof payload.sub === "string" &&
      typeof payload.membershipId === "string" &&
      typeof payload.companyId === "string" &&
      typeof payload.role === "string" &&
      typeof payload.iat === "number"
    ) {
      return {
        sub: payload.sub,
        email: (payload.email as string) ?? "",
        name: (payload.name as string) ?? "",
        membershipId: payload.membershipId,
        companyId: payload.companyId,
        role: payload.role,
        locale: (payload.locale as string) ?? "ar",
        issuedAt: payload.iat,
      };
    }
    return null;
  } catch {
    return null;
  }
}
