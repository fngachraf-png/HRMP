#!/usr/bin/env bash
# FWMS — تشغيل الخادم المحلي على Termux (Samsung A53 5G)
# ملكية: المساعد الثاني — راجع docs/DATABASE_GUIDE.md §2 و§9
# يمنع نوم أندرويد قتل العملية، ثم يشغل الخادم على كل الواجهات.

set -euo pipefail

cd "$(dirname "$0")/../.."   # جذر المستودع

# 1) منع نوم الجهاز (إلزامي في Termux)
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || echo "⚠ termux-wake-lock غير متوفر (شغّل داخل Termux مباشرة)"

# 2) مزامنة الكود وقاعدة البيانات
git pull --ff-only origin main
npx prisma migrate deploy

# 3) البناء عند الحاجة ثم التشغيل
if [ ! -d .next ]; then
  npm run build
fi

exec npm start -- -H 0.0.0.0 -p 3000
