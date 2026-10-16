// FWMS — بذور المرحلة 0–2: مالك المنصة + شركة تجريبية + مستخدمو الأدوار الخمسة + بنية تنظيمية تجريبية
// ملكية: مشتركة (المساعد الأول). قواعد الأجور pay_rules مهمة المساعد الثاني (docs/DATABASE_GUIDE.md §6)
// التشغيل: bun prisma/seeds/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedPayRules } from "./pay-rules";

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

  // 5) مستخدمو الأدوار الخمسة (تجريبيون) + عاملان إضافيان لسيناريو التغطية السريعة (المرحلة 5)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [
    { id: "user-super-admin", email: "owner@fwms.local", fullName: "مالك المنصة", role: "super_admin" },
    { id: "user-admin", email: "admin@demo.ma", fullName: "مدير العمليات", role: "admin" },
    { id: "user-accountant", email: "accountant@demo.ma", fullName: "المسؤول عن المحاسبة", role: "accountant" },
    { id: "user-coadmin", email: "supervisor@demo.ma", fullName: "المشرف الميداني", role: "co_admin" },
    { id: "user-employee", email: "worker@demo.ma", fullName: "عامل ميداني", role: "employee" },
    { id: "user-employee-2", email: "worker2@demo.ma", fullName: "عاملة ميدانية بديلة", role: "employee" },
    { id: "user-employee-3", email: "worker3@demo.ma", fullName: "عامل ميداني ثالث", role: "employee" },
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

  // قواعد الأجور المغربية (pay_rules بتواريخ السريان) — ملكية المساعد الثاني:
  //    prisma/seeds/pay-rules.ts وفق docs/DATABASE_GUIDE.md §6 (لا تُخترع قيم هنا أبدًا).
  await seedPayRules(db);

  // 7) بنية تنظيمية تجريبية (المرحلة 2 — SPEC §8): فرع + مشروع + مواقع الدار البيضاء + مجموعات
  const branch = await db.branch.upsert({
    where: { id: "branch-demo-casa" },
    update: {},
    create: {
      id: "branch-demo-casa",
      companyId: company.id,
      name: "فرع الدار البيضاء — أنفا",
      code: "CASA-01",
      city: "الدار البيضاء",
      address: "شارع الزرقطوني، الدار البيضاء",
    },
  });

  const project = await db.project.upsert({
    where: { id: "project-demo-tower" },
    update: {},
    create: {
      id: "project-demo-tower",
      companyId: company.id,
      branchId: branch.id,
      name: "مشروع برج الأعمال الزجاجي",
      code: "PRJ-2026-001",
      startsAt: new Date("2026-01-05T00:00:00Z"),
      endsAt: new Date("2027-06-30T00:00:00Z"),
    },
  });

  // مواقع بإحداثيات حقيقية تقريبية بالدار البيضاء — معيار القبول: موقع بنصف قطر يظهر على الخريطة
  const demoSites = [
    { id: "site-demo-gate", name: "موقع الحراسة — البوابة الرئيسية", address: "مدخل البرج، شارع الزرقطوني", latitude: 33.5731, longitude: -7.5898, radiusM: 60 },
    { id: "site-demo-mall", name: "موقع النظافة — المركز التجاري", address: "Anfa Place، الدار البيضاء", latitude: 33.5922, longitude: -7.632, radiusM: 80 },
    { id: "site-demo-garden", name: "موقع البستنة — حديقة الجامعة العربية", address: "الدار البيضاء", latitude: 33.5913, longitude: -7.6189, radiusM: 50 },
  ];
  for (const s of demoSites) {
    await db.site.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, companyId: company.id, branchId: branch.id, projectId: project.id },
    });
  }

  const demoGroups = [
    { id: "group-demo-night", name: "فريق الحراسة الليلي", description: "مناوبات ليلية متصلة (22:00–06:00)" },
    { id: "group-demo-clean", name: "فريق النظافة الصباحي", description: "توزيع على مواقع متعددة (06:00–14:00)" },
  ];
  for (const g of demoGroups) {
    await db.workerGroup.upsert({
      where: { id: g.id },
      update: {},
      create: { ...g, companyId: company.id },
    });
  }

  // 8) قوالب ورديات بحسب القطاع (المرحلة 3 — SPEC §4.1): حراسة ليل متصل، بناء نهار محدد، نظافة توزيع متعدد
  //    endTime ≤ start = وردية تعبر منتصف الليل (الحراسة الليلية)
  const demoTemplates = [
    { id: "template-demo-security-night", name: "حراسة — ليل متصل", sector: "security", startTimeMin: 1320, endTimeMin: 360, breakMinutes: 0, notes: "22:00–06:00 تعبر منتصف الليل (SPEC §11.4)" },
    { id: "template-demo-construction-day", name: "بناء — نهار محدد", sector: "construction", startTimeMin: 480, endTimeMin: 1020, breakMinutes: 60, notes: "08:00–17:00 مع استراحة ساعة" },
    { id: "template-demo-cleaning-morning", name: "نظافة — فوج صباحي", sector: "cleaning", startTimeMin: 360, endTimeMin: 840, breakMinutes: 30, notes: "06:00–14:00" },
    { id: "template-demo-cleaning-evening", name: "نظافة — فوج مسائي", sector: "cleaning", startTimeMin: 840, endTimeMin: 1320, breakMinutes: 30, notes: "14:00–22:00 — يُستخدم مع الصباحي لقاعدة تناوب" },
  ];
  for (const t of demoTemplates) {
    await db.shiftTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, companyId: company.id },
    });
  }

  // 9) سيناريو التغطية السريعة (المرحلة 5 — SPEC §4.1 و§8): ورديات «اليوم» بتوقيت الشركة
  //    - worker1 (البوابة 06:00–14:00): العامل الغائب — بلا تسجيل حضور ← مرشّح لسحب بديل
  //    - worker3 (المركز التجاري 08:00–17:00): متعارض مع نافذة البوابة ← يجب استبعاده من المتاحين
  //    - worker2: حرّ اليوم ← البديل المتاح
  //    معرّفات بتاريخ اليوم كي تعيد البذور توليد السيناريو يوميًا (idempotent في نفس اليوم)
  const tzOffsetMs = (date: Date, timeZone: string): number => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second")) - date.getTime();
  };
  const zonedToUtc = (localDate: string, minutes: number, timeZone: string): Date => {
    const [y, m, d] = localDate.split("-").map(Number);
    const naive = new Date(Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60));
    const pass1 = new Date(naive.getTime() - tzOffsetMs(naive, timeZone));
    return new Date(naive.getTime() - tzOffsetMs(pass1, timeZone));
  };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: company.timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const coverageShifts = [
    { suffix: "gate", workerId: "user-employee", siteId: "site-demo-gate", templateId: "template-demo-cleaning-morning", startTimeMin: 360, endTimeMin: 840, breakMinutes: 30 },
    { suffix: "mall", workerId: "user-employee-3", siteId: "site-demo-mall", templateId: "template-demo-construction-day", startTimeMin: 480, endTimeMin: 1020, breakMinutes: 60 },
  ];
  for (const s of coverageShifts) {
    const id = `shift-demo-${today}-${s.suffix}`;
    await db.shift.upsert({
      where: { id },
      update: {}, // لا نلمس ورديات أنشأها المستخدمون فعليًا — السيناريو يُنشأ مرة يوميًا
      create: {
        id,
        companyId: company.id,
        workerUserId: s.workerId,
        siteId: s.siteId,
        templateId: s.templateId,
        localDate: today,
        startsAt: zonedToUtc(today, s.startTimeMin, company.timezone),
        endsAt: zonedToUtc(today, s.endTimeMin, company.timezone),
        breakMinutes: s.breakMinutes,
        status: "scheduled",
        source: "manual",
        notes: "بذور سيناريو التغطية السريعة (المرحلة 5)",
        createdByUserId: "user-admin",
      },
    });
  }

  console.log("✓ مالك المنصة + الشركة التجريبية + 7 مستخدمين (5 أدوار + عاملان للتغطية)");
  console.log("✓ بنية تنظيمية: فرع الدار البيضاء + مشروع برج + 3 مواقع جغرافية + مجموعتا عمال");
  console.log("✓ جدولة: 4 قوالب ورديات قطاعية (حراسة ليل / بناء نهار / نظافة صباحي+مسائي)");
  console.log(`✓ سيناريو التغطية ${today}: عامل غائب بالبوابة + بديل متاح + عامل متعارض`);
  console.log(`  كلمة المرور التجريبية للكل: ${DEMO_PASSWORD}`);
  console.log("  owner@fwms.local | admin@demo.ma | accountant@demo.ma | supervisor@demo.ma | worker@demo.ma | worker2@demo.ma | worker3@demo.ma");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
