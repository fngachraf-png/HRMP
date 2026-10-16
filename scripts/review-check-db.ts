// مراجعة عمل المساعد الثاني — فحص القاعدة الحية وبذور قواعد الأجور
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const payRules = await db.payRule.count();
const payRulesBp = await db.payRule.count({ where: { unit: "basis_points" } });
const irRaw = await db.payRule.findFirst({ where: { key: "ir.brackets" } });
const companies = await db.company.count();
const users = await db.user.count();
const shifts = await db.shift.count();
const attendance = await db.attendanceEvent.count();
const payRuleTable = await db.payRule.findMany({
  where: { companyId: null },
  orderBy: { key: "asc" },
});

console.log(
  JSON.stringify(
    {
      payRules,
      payRulesBp,
      irBrackets: irRaw?.valueText ? JSON.parse(irRaw.valueText).brackets.length : null,
      companies,
      users,
      shifts,
      attendance,
      notificationModelExists: false,
      sampleKeys: payRuleTable.slice(0, 5).map((r) => r.key),
      allHaveSource: payRuleTable.every((r) => !!r.source),
      allVerifiedNull: payRuleTable.every((r) => r.verifiedBy === null),
    },
    null,
    1,
  ),
);

await db.$disconnect();
