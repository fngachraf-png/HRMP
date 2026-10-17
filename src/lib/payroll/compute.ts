// FWMS — محرك حساب كشف الأجر (SPEC §4.3 و§11.6 — المرحلة 6أ+6ب): دوال نقية بلا قاعدة بيانات
// خط الحساب الشهري (SPEC §11.6 بالترتيب):
//   1) الإجمالي = أساس + إضافي (بنسب المادة 201) + علاوات/مكافآت − خصم الغياب
//   2) SBI = الإجمالي − المعفى من IR (نقل/وجبات ضمن السقوف)
//   3) CNSS أجير = (0.52% + 3.96%) × min(الأساس، 6000) — فرعين منفصلين (لوازم التصريح)
//   4) AMO أجير = 2.26% × الأساس (بلا سقف)
//   5) الحصة المهنية: 35% (سقف 2500) للإجمالي ≤ 6500، وإلا 25% (سقف 2916.67)
//   6) RNI = SBI − CNSS − AMO − الحصة المهنية
//   7) IR = شريحة RNI × النسبة − المطروح
//   8) IR الصافي = IR − (المعالون × 50، سقف 6) — لا ينزل عن صفر
//   9) الصافي = الإجمالي − CNSS − AMO − IR − خصومات أخرى (سلف...)
//  + تكلفة المشغّل فرعًا فرعًا (1.05/7.93/6.40/4.11/1.60%)
//
// ⚠️ ملاحظة توثيقية (تُراجَع من المحاسب — راجع KNOWLEDGE_BASE): نص SPEC §11.6 خطوة 5 يقول
//    «الحصة المهنية من (SBI − CNSS − AMO)» بينما أمثلة §11.9 المرجعية (معيار قبول 6ب الحرفي)
//    تحسبها من SBI مباشرة (مثال 4000: 1400 لا 1305.64). اعتمدنا §11.9 (المعيار الملزم)
//    مع إثبات التطابق إلى السنتيم في tests/payroll-engine.ts.
// التقريب: سنتيم في نهاية كل بند فقط (SPEC §11.6 «تفاصيل تُحسم في الكود وتُختبر»)
import type {
  Computation,
  ComputedLine,
  ComputeInput,
  ManualLineInput,
  PayrollWarning,
} from "./types";

/** تطبيق نسبة مخزنة «نسبة مئوية ×10000» على أساس بالسنتيم → سنتيم مقرَّب */
export function applyRate(baseCents: number, rateX10000: number): number {
  return Math.round((baseCents * rateX10000) / 1_000_000);
}

/** أجر الساعة المكافئ (سنتيم) بحسب نظام الاحتساب — للإضافي وحد SMIG */
export function effectiveHourlyCents(input: ComputeInput): number | null {
  const { employee, rules } = input;
  if (employee.payType === "hourly") return employee.hourlyRateCents;
  if (employee.payType === "monthly") {
    if (employee.monthlyCents === null) return null;
    return Math.round(employee.monthlyCents / input.monthlyHoursDivisor);
  }
  if (employee.dailyRateCents === null || rules.dailyHours <= 0) return null;
  return Math.round(employee.dailyRateCents / rules.dailyHours);
}

/** دقائق الإضافي → مبلغ بند (سعر الساعة × (1 + النسبة)) */
function otLine(minutes: number, hourlyCents: number, bp: number, kind: string, order: number, reason?: string): ComputedLine {
  const amount = Math.round((minutes * hourlyCents * (1_000_000 + bp)) / (60 * 1_000_000));
  return { kind, minutes, rateBp: bp, amountCents: amount, exemptIrCents: 0, exemptCnssCents: 0, order, reason };
}

const MANUAL_KINDS: ManualLineInput["kind"][] = ["bonus", "deduction", "allowance_transport", "allowance_meals"];

/** الحساب الكامل لكشف واحد — كل المبالغ سنتيم صحيح */
export function computePayslip(input: ComputeInput): Computation {
  const { employee, worked, manualLines, rules } = input;
  const warnings = new Set<PayrollWarning>();

  if (employee.payType === "hourly" && employee.hourlyRateCents === null) throw new Error("missing_hourly_rate");
  if (employee.payType === "daily" && employee.dailyRateCents === null) throw new Error("missing_daily_rate");
  if (employee.payType === "monthly" && employee.monthlyCents === null) throw new Error("missing_monthly_rate");
  for (const line of manualLines) {
    if (!MANUAL_KINDS.includes(line.kind)) throw new Error(`invalid_manual_kind: ${line.kind}`);
    if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) throw new Error("invalid_manual_amount");
  }

  const hourly = effectiveHourlyCents(input);
  const lines: ComputedLine[] = [];

  // ── 1) الأساس (أنظمة الاحتساب الثلاثة — SPEC §4.3) ─────────────
  if (employee.payType === "hourly") {
    lines.push({
      kind: "base_hours",
      minutes: worked.baseMinutes,
      rateBp: null,
      amountCents: Math.round((worked.baseMinutes * (employee.hourlyRateCents as number)) / 60),
      exemptIrCents: 0,
      exemptCnssCents: 0,
      order: 10,
    });
  } else if (employee.payType === "daily") {
    lines.push({
      kind: "base_days",
      minutes: worked.baseMinutes,
      rateBp: null,
      amountCents: worked.workedDays.length * (employee.dailyRateCents as number),
      exemptIrCents: 0,
      exemptCnssCents: 0,
      order: 10,
    });
  } else {
    lines.push({
      kind: "base_monthly",
      minutes: worked.baseMinutes,
      rateBp: null,
      amountCents: employee.monthlyCents as number,
      exemptIrCents: 0,
      exemptCnssCents: 0,
      order: 10,
    });
    // خصم الغياب غير المبرر تلقائيًا (SPEC §4.3): المجدول − الموثق، بسعر الساعة المكافئ
    if (worked.attendanceBased) {
      const absentMinutes = Math.max(0, worked.scheduledMinutes - worked.attendedMinutes);
      if (absentMinutes > 0) {
        const hourlyEq = Math.round((employee.monthlyCents as number) / input.monthlyHoursDivisor);
        lines.push({
          kind: "absence_deduction",
          minutes: absentMinutes,
          rateBp: null,
          amountCents: -Math.round((absentMinutes * hourlyEq) / 60),
          exemptIrCents: 0,
          exemptCnssCents: 0,
          order: 12,
        });
      }
    }
  }

  // ── 2) الإضافي: الحالات الأربع (المادة 201 — SPEC §11.4) ───────
  const ot = worked.overtime;
  if (ot.dayNormal > 0 && hourly !== null) lines.push(otLine(ot.dayNormal, hourly, rules.otDayNormalBp, "ot_day_normal", 20));
  if (ot.nightNormal > 0 && hourly !== null) lines.push(otLine(ot.nightNormal, hourly, rules.otNightNormalBp, "ot_night_normal", 21));
  if (ot.dayRest > 0 && hourly !== null) lines.push(otLine(ot.dayRest, hourly, rules.otDayRestBp, "ot_day_rest", 22));
  if (ot.nightRest > 0 && hourly !== null) lines.push(otLine(ot.nightRest, hourly, rules.otNightRestBp, "ot_night_rest", 23));

  // ── 3) البنود اليدوية: مكافآت وبدلات (معفى ضمن السقوف) وخصومات ─
  for (const manual of manualLines) {
    if (manual.kind === "bonus") {
      lines.push({ kind: "bonus", minutes: null, rateBp: null, amountCents: manual.amountCents, exemptIrCents: 0, exemptCnssCents: 0, order: 30, reason: manual.reason });
    } else if (manual.kind === "deduction") {
      // خصم من الصافي (سلف وغيرها — SPEC §11.6 خطوة 9) — لا يمس الوعاء الضريبي
      lines.push({ kind: "deduction", minutes: null, rateBp: null, amountCents: -manual.amountCents, exemptIrCents: 0, exemptCnssCents: 0, order: 60, reason: manual.reason });
    } else if (manual.kind === "allowance_transport") {
      const cap = employee.transportZone === "outside" ? rules.exemptTransportOutsideCents : rules.exemptTransportUrbanCents;
      const exempt = Math.min(manual.amountCents, cap);
      if (manual.amountCents > cap) warnings.add("transport_cap_exceeded");
      // ما يتجاوز السقف يُضاف تلقائيًا إلى الخاضع للضريبة والاشتراكات (SPEC §11.6)
      lines.push({ kind: "allowance_transport", minutes: null, rateBp: null, amountCents: manual.amountCents, exemptIrCents: exempt, exemptCnssCents: exempt, order: 31, reason: manual.reason });
    } else {
      const irCap = rules.exemptMealsIrDailyCents * worked.workedDays.length;
      const cnssCap = rules.exemptMealsCnssDailyCents * worked.workedDays.length;
      const exemptIr = Math.min(manual.amountCents, irCap);
      const exemptCnss = Math.min(manual.amountCents, cnssCap);
      if (manual.amountCents > irCap || manual.amountCents > cnssCap) warnings.add("meals_caps_exceeded");
      lines.push({ kind: "allowance_meals", minutes: null, rateBp: null, amountCents: manual.amountCents, exemptIrCents: exemptIr, exemptCnssCents: exemptCnss, order: 32, reason: manual.reason });
    }
  }

  // ── الإجمالي والوعاءان ──────────────────────────────────────────
  const grossCents = lines
    .filter((l) => l.kind !== "deduction") // خصم السلف على الصافي لا الإجمالي
    .reduce((acc, l) => acc + l.amountCents, 0);
  const exemptIrTotal = lines.reduce((acc, l) => acc + l.exemptIrCents, 0);
  const exemptCnssTotal = lines.reduce((acc, l) => acc + l.exemptCnssCents, 0);
  const sbiCents = Math.max(0, grossCents - exemptIrTotal); // الإجمالي الخاضع للـ IR
  const cnssBaseCents = Math.max(0, grossCents - exemptCnssTotal); // الأساس الخاضع للـ CNSS/AMO

  // ── 4/5) اقتطاعات الأجير: CNSS فرعين بسقف + AMO بلا سقف ────────
  const cappedBase = Math.min(cnssBaseCents, rules.cnssCeilingCents);
  const cnssShort = applyRate(cappedBase, rules.cnssEmployeeShortBp);
  const cnssLong = applyRate(cappedBase, rules.cnssEmployeeLongBp);
  const amoEmployee = applyRate(cnssBaseCents, rules.amoEmployeeBp);
  lines.push({ kind: "cnss_employee_short", minutes: null, rateBp: rules.cnssEmployeeShortBp, amountCents: -cnssShort, exemptIrCents: 0, exemptCnssCents: 0, order: 40 });
  lines.push({ kind: "cnss_employee_long", minutes: null, rateBp: rules.cnssEmployeeLongBp, amountCents: -cnssLong, exemptIrCents: 0, exemptCnssCents: 0, order: 41 });
  lines.push({ kind: "amo_employee", minutes: null, rateBp: rules.amoEmployeeBp, amountCents: -amoEmployee, exemptIrCents: 0, exemptCnssCents: 0, order: 42 });
  const cnssEmployee = cnssShort + cnssLong;

  // ── 6) الحصة المهنية: الشريحة بحسب SBI ثم السقف ────────────────
  const use35 = sbiCents <= rules.proRate35LimitCents;
  const proRate = use35 ? rules.proRate35Bp : rules.proRate25Bp;
  const proCap = use35 ? rules.proCap35Cents : rules.proRate25CapCents;
  const proDeduction = Math.min(applyRate(sbiCents, proRate), proCap);
  lines.push({ kind: "pro_deduction", minutes: null, rateBp: proRate, amountCents: -proDeduction, exemptIrCents: 0, exemptCnssCents: 0, order: 43 });

  // ── 7/8) الضريبة على الدخل ─────────────────────────────────────
  const rniCents = Math.max(0, sbiCents - cnssEmployee - amoEmployee - proDeduction);
  const bracket = rules.irBrackets.find((b) => b.upToMonthlyCents === null || rniCents <= b.upToMonthlyCents);
  const irGross = bracket ? Math.max(0, applyRate(rniCents, bracket.rateBp) - bracket.deductMonthlyCents) : 0;
  const familyCount = Math.min(Math.max(0, employee.dependentsCount), rules.irFamilyDeductionCapPeople);
  const familyDeduction = familyCount * rules.irFamilyDeductionCents;
  const irNet = Math.max(0, irGross - familyDeduction);
  lines.push({ kind: "ir_gross", minutes: null, rateBp: bracket?.rateBp ?? null, amountCents: -irGross, exemptIrCents: 0, exemptCnssCents: 0, order: 50 });
  lines.push({ kind: "family_deduction", minutes: null, rateBp: null, amountCents: familyDeduction, exemptIrCents: 0, exemptCnssCents: 0, order: 51 });

  // ── 9) الصافي للدفع ─────────────────────────────────────────────
  const netDeductions = lines.filter((l) => l.kind === "deduction").reduce((acc, l) => acc + Math.abs(l.amountCents), 0);
  const netCents = grossCents - cnssEmployee - amoEmployee - irNet - netDeductions;

  // ── تكلفة المشغّل فرعًا فرعًا (SPEC §11.6 — تُعرض للمدير/المالك لا للأجير) ──
  const employerPrestShort = applyRate(cappedBase, rules.employerPrestShortBp);
  const employerPrestLong = applyRate(cappedBase, rules.employerPrestLongBp);
  const employerFamily = applyRate(cnssBaseCents, rules.employerFamilyBp);
  const employerAmo = applyRate(cnssBaseCents, rules.employerAmoBp);
  const employerTfp = applyRate(cnssBaseCents, rules.employerTfpBp);
  const employerCost = employerPrestShort + employerPrestLong + employerFamily + employerAmo + employerTfp;
  lines.push({ kind: "employer_prest_short", minutes: null, rateBp: rules.employerPrestShortBp, amountCents: employerPrestShort, exemptIrCents: 0, exemptCnssCents: 0, order: 70 });
  lines.push({ kind: "employer_prest_long", minutes: null, rateBp: rules.employerPrestLongBp, amountCents: employerPrestLong, exemptIrCents: 0, exemptCnssCents: 0, order: 71 });
  lines.push({ kind: "employer_family", minutes: null, rateBp: rules.employerFamilyBp, amountCents: employerFamily, exemptIrCents: 0, exemptCnssCents: 0, order: 72 });
  lines.push({ kind: "employer_amo", minutes: null, rateBp: rules.employerAmoBp, amountCents: employerAmo, exemptIrCents: 0, exemptCnssCents: 0, order: 73 });
  lines.push({ kind: "employer_tfp", minutes: null, rateBp: rules.employerTfpBp, amountCents: employerTfp, exemptIrCents: 0, exemptCnssCents: 0, order: 74 });

  // ── الفحوص والتحذيرات ───────────────────────────────────────────
  const smigBreached = hourly === null ? true : hourly < rules.smigHourlyCents;
  if (smigBreached) warnings.add("smig_breached"); // يمنع الاعتماد (SPEC §11.2)
  if (!worked.attendanceBased && worked.scheduledMinutes === 0) warnings.add("no_attendance");
  if (netCents < 0) warnings.add("negative_net");
  const unverified = Object.values(rules.provenance).filter((p) => p.verifiedBy === null);
  if (unverified.length > 0) warnings.add("unverified_rules"); // يمنع الاعتماد حتى يوثقها المحاسب

  lines.sort((a, b) => a.order - b.order);

  const otMinutes = ot.dayNormal + ot.nightNormal + ot.dayRest + ot.nightRest;
  return {
    lines,
    totals: {
      workedMinutes: worked.baseMinutes + otMinutes,
      breakMinutes: worked.breakMinutes,
      overtimeMinutes: otMinutes,
      workedDays: worked.workedDays.length,
      grossCents,
      sbiCents,
      cnssBaseCents,
      cnssEmployeeCents: cnssEmployee,
      amoEmployeeCents: amoEmployee,
      proDeductionCents: proDeduction,
      rniCents,
      irGrossCents: irGross,
      familyDeductionCents: familyDeduction,
      irNetCents: irNet,
      netCents,
      employerCostCents: employerCost,
      totalCostCents: grossCents + employerCost,
      effectiveHourlyCents: hourly,
    },
    smigBreached,
    warnings: [...warnings],
  };
}

/** شرائح IR: أي شريحة تنطبق على RNI معين (للاختبار والعرض) */
export function findIrBracket(rateBp: number | null, brackets: { upToMonthlyCents: number | null; rateBp: number }[]): { upToMonthlyCents: number | null } | null {
  if (rateBp === null) return null;
  return brackets.find((b) => b.rateBp === rateBp) ?? null;
}
