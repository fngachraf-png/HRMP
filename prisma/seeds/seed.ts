// FWMS — بذور المرحلة 0–1: مالك المنصة + شركة تجريبية + مستخدمو الأدوار الخمسة
// ملكية: مشتركة (المساعد الأول). قواعد الأجور pay_rules مهمة المساعد الثاني (docs/DATABASE_GUIDE.md §6)
// التشغيل: bun prisma/seeds/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "Fwms#2026"; // تجريبي فقط — يُستبدل في الإنتاج

async function main() {
  console.log("🌱 FWMS seed — المرحلة 0–1 ...");

  // 1) مالك المنصة (white-label — SPEC §3.2)
  const owner = await db.platformOwner.upsert({
    where: { id: "platform-owner-fwms" },
    update: {},
    create: {
      id: "platform-owner-fwms",
      legalName: "FWMS Platform Owner (Demo)",
      displayName: "FWMS",
      contactEmail: "owner@fwms.local",
      defaultLocale: "ar",
      defaultCurrency: "MAD",
    },
  });

  // 2) شركة تجريبية
  const company = await db.company.upsert({
    where: { id: "company-demo" },
    update: {},
    create: {
      id: "company-demo",
      platformOwnerId: owner.id,
      legalName: "شركة الأمن والنظافة التجريبية SARL",
      tradeName: "Demo Security & Cleaning",
      taxId: "001234567000089",
      cnssNumber: "1234567",
      locale: "ar",
      timezone: "Africa/Casablanca",
      status: "active",
    },
  });

  // 3) إعدادات الشركة بقيم مغربية افتراضية (SPEC §11)
  await db.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      workWeekHours: 44,
      restDay: 5,
      monthlyHoursDivisor: 191,
      showWagesToSupervisor: false,
      dualApprovalEnabled: false,
    },
  });

  // 4) سياسة تحقق افتراضية: GPS فقط (none) — تفعيل face قرار مالك (SPEC §4.2)
  await db.verificationPolicy.upsert({
    where: { id: "vp-company-demo" },
    update: {},
    create: {
      id: "vp-company-demo",
      companyId: company.id,
      policy: "none",
      faceAcknowledged: false,
    },
  });

  // 5) مستخدمو الأدوار الخمسة (تجريبيون)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [
    { id: "user-super-admin", email: "owner@fwms.local", fullName: "مالك المنصة", role: "super_admin" },
    { id: "user-admin", email: "admin@demo.ma", fullName: "مدير العمليات", role: "admin" },
    { id: "user-accountant", email: "accountant@demo.ma", fullName: "المسؤول عن المحاسبة", role: "accountant" },
    { id: "user-coadmin", email: "supervisor@demo.ma", fullName: "المشرف الميداني", role: "co_admin" },
    { id: "user-employee", email: "worker@demo.ma", fullName: "عامل ميداني", role: "employee" },
  ];

  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        locale: "ar",
        isActive: true,
      },
    });
    // العضوية في الشركة التجريبية (super_admin يظل مرتبطًا بالمالك عبر دوره عبر الشركات)
    await db.userMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      update: {},
      create: {
        userId: user.id,
        companyId: company.id,
        role: u.role,
        isDefault: true,
      },
    });
  }

  // 6) منح المحاسب الخارجي (نموذج داخلي هنا — SPEC §3.3)
  await db.accountantGrant.upsert({
    where: { id: "grant-accountant-demo" },
    update: {},
    create: {
      id: "grant-accountant-demo",
      companyId: company.id,
      userId: "user-accountant",
      mode: "internal",
      grantedBy: "user-super-admin",
      startsAt: new Date("2026-01-01T00:00:00Z"),
    },
  });

  // ⚠️ pay_rules (قواعد الأجور المغربية بتواريخ السريان) مهمة المساعد الثاني:
  //    راجع docs/DATABASE_GUIDE.md §6 — لا تُخترع هنا.

  console.log("✓ مالك المنصة + الشركة التجريبية + 5 مستخدمين بأدوارهم");
  console.log(`  كلمة المرور التجريبية للكل: ${DEMO_PASSWORD}`);
  console.log("  owner@fwms.local | admin@demo.ma | accountant@demo.ma | supervisor@demo.ma | worker@demo.ma");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
