#!/usr/bin/env bash
# FWMS — تشغيل الخادم المحلي على Termux (Samsung A53 5G)
# ملكية: المساعد الثاني — راجع docs/DATABASE_GUIDE.md §2 و§9
# يمنع نوم أندرويد قتل العملية، ثم يشغل الخادم على كل الواجهات.

set -euo pipefail

cd "$(dirname "$0")/../.."   # جذر المستودع

# 0) cron للنسخ الاحتياطي اليومي (إن كان متاحًا — راجع docs/DATABASE_GUIDE.md §7)
service cron start >/dev/null 2>&1 || true

# 1) منع نوم الجهاز (إلزامي في Termux)
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || echo "⚠ termux-wake-lock غير متوفر (شغّل داخل Termux مباشرة)"

# 2) مزامنة الكود وقاعدة البيانات
git pull --ff-only origin main
npx prisma migrate deploy

# 3) النفق الدائم (Cloudflare Tunnel) — إن وُجد توكنه (docs/DATABASE_GUIDE.md §2.4)
if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' .env 2>/dev/null; then
  nohup bash infra/termux/run-tunnel.sh > db/tunnel.log 2>&1 &
  echo "✔ النفق الدائم يُشغَّل في الخلفية (db/tunnel.log)"
fi

# 4) البناء عند الحاجة ثم التشغيل
if [ ! -d .next ]; then
  npm run build
fi

exec npm start -- -H 0.0.0.0 -p 3000
