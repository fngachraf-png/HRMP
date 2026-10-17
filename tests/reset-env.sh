#!/usr/bin/env bash
# FWMS — إعادة بيئة الاختبار نظيفة (سابقة المراحل — درس 6ج: الاختبارات ذات الحالة على قاعدة نظيفة)
# يحل المسار الفعلي لقاعدة البيانات (متغير الصدفة يتفوق على .env — درس KNOWLEDGE_BASE §9)
set -euo pipefail
cd "$(dirname "$0")/.."

DB_PATH="${DATABASE_URL:-file:./db/custom.db}"
DB_PATH="${DB_PATH#file:}"
if [ ! -f "$DB_PATH" ] || [ -z "$DB_PATH" ]; then
  DB_PATH="$(pwd)/db/custom.db"
fi
echo "→ القاعدة الفعلية: $DB_PATH"

rm -f "$DB_PATH"
bunx prisma db push --skip-generate > /dev/null 2>&1
echo "✓ مخطط مطبَّق"
bun prisma/seeds/seed.ts > /tmp/fwms-seed.log 2>&1
echo "✓ بذور كاملة"

pkill -f "next dev" 2>/dev/null || true
sleep 2
setsid -f bun --bun next dev -p 3000 > dev.log 2>&1 < /dev/null

for i in 1 2 3; do
  sleep 13
  R=$(curl -s -m 10 http://localhost:3000/api/health 2>/dev/null || true)
  if echo "$R" | rg -q '"status":"ok"'; then
    echo "✓ الخادم جاهز: $R"
    exit 0
  fi
  echo "  محاولة $i — إعادة تشغيل (درس بداية Prisma الباردة)"
  pkill -f "next dev" 2>/dev/null || true
  sleep 2
  setsid -f bun --bun next dev -p 3000 > dev.log 2>&1 < /dev/null
done
echo "✗ الخادم لم يجهز"
exit 1
