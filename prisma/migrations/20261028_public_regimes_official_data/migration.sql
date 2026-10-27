-- HRMP — جولة 2026-10-28: تعزيز القالبين العموميين بالمرجع الرسمي (الجريدة الرسمية)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) مخطط: dailyHours/weeklyHours من Int إلى Float — مرسوم 2.05.916 يقرر 36.5 ساعة
--    أسبوعيًا للوظيفة العمومية (36س30) و7.5 س يوميًا (الإثنين–الخميس) — لا تُمثَّل
--    بأعداد صحيحة، ولا يجوز تقريبها («وثّق مصدر كل قيمة» — SPEC §12).
--    المال يبقى Int بالسنتيم حرفيًا (قاعدة نافذة) — التغيير للساعات فقط.
-- 2) بيانات (idempotent على قواعد مُبذَّرة): تحديث قالبَي الوظيفة العمومية
--    والمؤسسات العمومية بقيم الجريدة الرسمية:
--    · الوظيفة العمومية: مرسوم 2.05.916 (ج.ر 5336 — 36.5 س/أسبوع، 1,898 س/سنة) ·
--      القانون 011.71 كما عُدّل بالقانون 71.14 (CMR 14%+14%) · القانون 65.00 (AMO
--      2.5%+2.5% — CNOPS حتى 31/01/2027 ثم CNSS بالقانون 54.23) · يبقى غير مكتمل:
--      الحد الأدنى النظامي 4,000 د.م. صافي (بلاغ رئاسة الحكومة 08/2024) لا يُحوَّل
--      إلى أرضية خام دون تأكيد محاسب الجهة — لا تُخترع قيمة («لا هلوسة»).
--    · المؤسسات العمومية: مدونة الشغل م.184 (44 س/أسبوع، 2,288 س/سنة، سقف 10 س/يوم) ·
--      الظهير 1.77.216 (RCAR 6%+12% بسقف 22,400 د.م./شهر لسنة 2026) · مرسوم 2.25.983
--      (ج.ر 7469 — SMIG 17.92 د.م./ساعة) ⇒ مكتمل بتأكيد المحاسب.
--    على قاعدة فارغة/جديدة: التعديلات لا تطابق صفوفًا (لا قوالب بعد) — البذور
--    تنشئها لاحقًا بنفس القيم (بذور idempotent)، فلا تعارض إطلاقًا.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayRegime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bundle" TEXT NOT NULL DEFAULT 'general',
    "bundleStatus" TEXT NOT NULL DEFAULT 'incomplete',
    "minWageType" TEXT NOT NULL DEFAULT 'hourly',
    "minWageCents" INTEGER NOT NULL,
    "dailyHours" REAL NOT NULL DEFAULT 8,
    "weeklyHours" REAL NOT NULL DEFAULT 44,
    "annualHours" INTEGER,
    "nightStart" TEXT NOT NULL DEFAULT '21:00',
    "nightEnd" TEXT NOT NULL DEFAULT '06:00',
    "monthlyDaysBasis" INTEGER NOT NULL DEFAULT 26,
    "declarationProfile" TEXT NOT NULL DEFAULT 'cnss_ebds',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL,
    "source" TEXT,
    "needsAccountantConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayRegime_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PayRegime" ("annualHours", "bundle", "bundleStatus", "companyId", "confirmedAt", "confirmedBy", "createdAt", "dailyHours", "declarationProfile", "effectiveFrom", "id", "isActive", "key", "minWageCents", "minWageType", "monthlyDaysBasis", "name", "needsAccountantConfirmation", "nightEnd", "nightStart", "notes", "source", "updatedAt", "version", "weeklyHours") SELECT "annualHours", "bundle", "bundleStatus", "companyId", "confirmedAt", "confirmedBy", "createdAt", "dailyHours", "declarationProfile", "effectiveFrom", "id", "isActive", "key", "minWageCents", "minWageType", "monthlyDaysBasis", "name", "needsAccountantConfirmation", "nightEnd", "nightStart", "notes", "source", "updatedAt", "version", "weeklyHours" FROM "PayRegime";
DROP TABLE "PayRegime";
ALTER TABLE "new_PayRegime" RENAME TO "PayRegime";
CREATE INDEX "PayRegime_companyId_isActive_idx" ON "PayRegime"("companyId", "isActive");
CREATE INDEX "PayRegime_bundle_bundleStatus_idx" ON "PayRegime"("bundle", "bundleStatus");
CREATE UNIQUE INDEX "PayRegime_companyId_key_version_key" ON "PayRegime"("companyId", "key", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- ─── قالب الوظيفة العمومية: المدة والتوقيت الرسميان ───────────────────
UPDATE "PayRegime" SET
  "name" = 'القطاع العام — الوظيفة العمومية',
  "dailyHours" = 7.5,
  "weeklyHours" = 36.5,
  "annualHours" = 1898,
  "needsAccountantConfirmation" = 1,
  "source" = 'مرسوم 2.05.916 (ج.ر 5336 — 21/07/2005) للمدة والتوقيت · القانون 011.71 كما عُدّل بالقانون 71.14 (CMR 14%+14%) · القانون 65.00 (AMO 2.5%+2.5%) · مرسوم 2.73.722 (سلالم الأجور) · بلاغ رئاسة الحكومة 08/2024 (حد أدنى 4,000 د.م. صافي)',
  "notes" = 'بنود CMR وAMO مُثبّتة من النصوص الرسمية — يُدخل محاسب الجهة الحد الأدنى الخام المعتمد وسلالم الأجور والتعويضات الخاصة (السكن/التأطير/الأخطار/المنطقة) بتواريخ سريان، ثم يُعتمد المسار. نظام الأجر: المرتب السنوي = الرقم الاستدلالي × قيمة النقطة (98.85 د.م. للشريحة 1–100، و79.62 للـ101–150، و50.92 لما فوق 150 — سارية 2026) + التعويضات النظامية. التوقيت الإداري: الإثنين–الجمعة 8:30–16:30 باستراحة 30 دقيقة وساعة صلاة الجمعة (رمضان: 9:00–15:00). المدة الشهرية المرجعية 158.17 ساعة/شهر (الأجر الساعي للحد الأدنى الصافي 4,000 د.م. = 25.29 د.م./ساعة). التقاعد: CMR سن 63 (65 لبعض الفئات) ومعاش 2%/سنة بعد 2017 على متوسط آخر 8 سنوات — سن التقاعد المبكر بعد 24 سنة خدمة (رجال) و18 (نساء).',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "companyId" IS NULL AND "key" = 'public_civil_service';

-- ─── قالب المؤسسات العمومية: م.184 + RCAR + SMIG ⇒ مكتمل ────────────
UPDATE "PayRegime" SET
  "name" = 'المؤسسات العمومية والشركات العامة',
  "bundleStatus" = 'complete',
  "minWageCents" = 1792,
  "dailyHours" = 8,
  "weeklyHours" = 44,
  "annualHours" = 2288,
  "needsAccountantConfirmation" = 1,
  "source" = 'مدونة الشغل 65.99 م.184 (44 س/أسبوع أو 2288 س/سنة، سقف 10 س/يوم) · الظهير 1.77.216 (RCAR 6%+12% بسقف 22,400 د.م./شهر 2026) · القانون 65.00 (AMO 2.5%+2.5%) · مرسوم 2.25.983 (ج.ر 7469 — SMIG 17.92 د.م./ساعة من 01/01/2026)',
  "notes" = 'قاعدة عامة قانونية للمؤسسات الخاضعة لمدونة الشغل (OCP/ONEE/ONCF/RAM/بريد المغرب/الوكالات المستقلة): RCAR إجباري للأعوان غير المرسمين (6% أجير + 12% مؤسسة) بسقف شهري 22,400 د.م. لسنة 2026 يُعاد تقييمه سنويًا، وAMO عبر CNOPS حتى 31/01/2027 ثم CNSS (القانون 54.23). الساعات الإضافية بنسب مدونة الشغل م.196-201 (+25% نهارًا، +50% ليلًا أو نهار الراحة، +100% ليل الراحة/الأعياد). المدة الشهرية المرجعية 191 ساعة. الحد الأدنى النظامي SMIG (3,422.72 د.م./شهر خام)، والشبكات الداخلية المصادق عليها أعلى منه (حد أدنى داخلي شائع 4,500–5,200 د.م.) — تُدخل من المؤسسة بنظامها الخاص بتواريخ سريان. يُؤكد المحاسب السقف السنوي والشبكة الداخلية قبل أول اعتماد.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "companyId" IS NULL AND "key" = 'public_entreprise';

-- ─── بنود الاشتراكات الرسمية للقالبين (حذف القديمة ثم إدراج الجديدة) ───
-- نمط INSERT..SELECT عبر CTE: على قاعدة فارغة (قبل البذور) لا صفوف ⇒ لا إدراج
-- ولا فشل NOT NULL — الهجرة لا تتعطل أبدًا مهما كانت حالة القاعدة.
DELETE FROM "RegimeContributionItem"
WHERE "regimeId" IN (SELECT "id" FROM "PayRegime" WHERE "companyId" IS NULL AND "key" IN ('public_civil_service', 'public_entreprise'));

-- الوظيفة العمومية — CMR (القانون 011.71/71.14) + AMO عمومية (القانون 65.00)
WITH v(id, rk, item_key, side, label, rate_bp, ceiling_cents, ord, src) AS (
  VALUES
    ('pci-cmr-employee', 'public_civil_service', 'cmr_employee', 'employee', 'CMR — المعاشات المدنية (حصة الموظف)', 140000, NULL, 40, 'القانون 011.71 كما عُدّل بالقانون 71.14 (إصلاح 2016) — 14% حصة الموظف'),
    ('pci-amo-employee', 'public_civil_service', 'amo_public_employee', 'employee', 'AMO قطاع عام (حصة الموظف)', 25000, NULL, 41, 'القانون 65.00 — 2.5% حصة الموظف (CNOPS حتى 31/01/2027 ثم CNSS بمقتضى القانون 54.23)'),
    ('pci-cmr-employer', 'public_civil_service', 'cmr_employer', 'employer', 'CMR — المعاشات المدنية (حصة الدولة)', 140000, NULL, 70, 'القانون 011.71 — 14% حصة الدولة (المشغل)'),
    ('pci-amo-employer', 'public_civil_service', 'amo_public_employer', 'employer', 'AMO قطاع عام (حصة المشغل)', 25000, NULL, 71, 'القانون 65.00 — 2.5% حصة المشغل')
)
INSERT INTO "RegimeContributionItem" ("id", "regimeId", "key", "side", "label", "rateBp", "amountCents", "ceilingCents", "basis", "order", "isActive", "source")
SELECT v.id, r."id", v.item_key, v.side, v.label, v.rate_bp, NULL, v.ceiling_cents, 'gross', v.ord, 1, v.src
FROM "PayRegime" r JOIN v ON r."key" = v.rk
WHERE r."companyId" IS NULL;

-- المؤسسات العمومية — RCAR (الظهير 1.77.216) + AMO عمومية (القانون 65.00)
WITH v(id, rk, item_key, side, label, rate_bp, ceiling_cents, ord, src) AS (
  VALUES
    ('pubent-rcar-employee', 'public_entreprise', 'rcar_employee', 'employee', 'RCAR — النظام الجماعي للتقاعد (حصة الأجير)', 60000, 2240000, 40, 'الظهير 1.77.216 — 6% حصة الأجير؛ سقف الاشتراك 22,400 د.م./شهر لسنة 2026 (rcar.ma — يُعاد تقييمه سنويًا)'),
    ('pubent-amo-employee', 'public_entreprise', 'amo_public_employee', 'employee', 'AMO قطاع عام (حصة الأجير)', 25000, NULL, 41, 'القانون 65.00 — 2.5% حصة الأجير (CNOPS حتى 31/01/2027 ثم CNSS بمقتضى القانون 54.23)'),
    ('pubent-rcar-employer', 'public_entreprise', 'rcar_employer', 'employer', 'RCAR — النظام الجماعي للتقاعد (حصة المؤسسة)', 120000, 2240000, 70, 'الظهير 1.77.216 — 12% حصة المؤسسة؛ نفس سقف 22,400 د.م./شهر لسنة 2026'),
    ('pubent-amo-employer', 'public_entreprise', 'amo_public_employer', 'employer', 'AMO قطاع عام (حصة المشغل)', 25000, NULL, 71, 'القانون 65.00 — 2.5% حصة المشغل')
)
INSERT INTO "RegimeContributionItem" ("id", "regimeId", "key", "side", "label", "rateBp", "amountCents", "ceilingCents", "basis", "order", "isActive", "source")
SELECT v.id, r."id", v.item_key, v.side, v.label, v.rate_bp, NULL, v.ceiling_cents, 'gross', v.ord, 1, v.src
FROM "PayRegime" r JOIN v ON r."key" = v.rk
WHERE r."companyId" IS NULL;

-- ─── خطوات الحساب القياسية للقالبين (من pay_rules — IR مشتركة بين المسارات) ──
DELETE FROM "RegimeCalcStep"
WHERE "regimeId" IN (SELECT "id" FROM "PayRegime" WHERE "companyId" IS NULL AND "key" IN ('public_civil_service', 'public_entreprise'));

WITH v(id, rk, kind, ord) AS (
  VALUES
    ('pci-step-10', 'public_civil_service', 'employee_contributions', 10),
    ('pci-step-20', 'public_civil_service', 'pro_deduction_tiered', 20),
    ('pci-step-30', 'public_civil_service', 'ir_brackets', 30),
    ('pci-step-40', 'public_civil_service', 'family_deduction', 40),
    ('pci-step-50', 'public_civil_service', 'employer_contributions', 50),
    ('pci-step-60', 'public_civil_service', 'net_summary', 60),
    ('pubent-step-10', 'public_entreprise', 'employee_contributions', 10),
    ('pubent-step-20', 'public_entreprise', 'pro_deduction_tiered', 20),
    ('pubent-step-30', 'public_entreprise', 'ir_brackets', 30),
    ('pubent-step-40', 'public_entreprise', 'family_deduction', 40),
    ('pubent-step-50', 'public_entreprise', 'employer_contributions', 50),
    ('pubent-step-60', 'public_entreprise', 'net_summary', 60)
)
INSERT INTO "RegimeCalcStep" ("id", "regimeId", "kind", "paramsJson", "order", "isActive")
SELECT v.id, r."id", v.kind, '{"fromPayRules":true}', v.ord, 1
FROM "PayRegime" r JOIN v ON r."key" = v.rk
WHERE r."companyId" IS NULL;
