#!/bin/bash
# FWMS — إعادة ضبط بيئة الاختبار (المرحلة 6ج): قاعدة نظيفة + بذور + خادم dev
# الاستخدام: bash tests/reset-env.sh
set -e
cd /home/z/my-project/fwms-repo

echo "⏹ إيقاف الخادم…"
pkill -f "next dev" 2>/dev/null || true
sleep 2

echo "🗑 قاعدة نظيفة…"
# المسار الفعلي: متغير الصيدفة يتفوق على .env (درس هذه الجلسة) — نحل كلاهما ثم نحذف
DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ]; then
  DB_PATH=$(grep '^DATABASE_URL' .env | head -1 | sed 's/^DATABASE_URL="*file://; s/"*$//')
fi
if [ -z "$DB_PATH" ] || [ ! "$DB_PATH" = /* ]; then
  DB_PATH="/home/z/my-project/db/custom.db" # الرجوع الآمن للمسار القياسي
fi
echo "  (قاعدة: $DB_PATH)"
rm -f "$DB_PATH" "$DB_PATH-journal" "$DB_PATH-wal" "$DB_PATH-shm"

echo "📥 مخطط + بذور…"
bunx prisma db push --skip-generate > /dev/null 2>&1
bun prisma/seeds/seed.ts 2>&1 | grep -E "✓|⚠" || true

echo "🚀 خادم dev (bun)…"
# درس سباق البداية الباردة: أول تشغيل بعد rm .next ينشئ alias العميل (‏.next/dev/node_modules)
# لكن أول تقييم للوحدة يفشل ويُخزَّن في ذاكرة العملية — كرر التشغيل حتى نجاح health
rm -rf .next
for ATTEMPT in 1 2 3; do
  pkill -f "next dev" 2>/dev/null || true
  sleep 2
  (nohup bun --bun next dev -p 3100 > /tmp/dev-reset.log 2>&1 &)
  sleep 30
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/health || true)
  if [ "$CODE" = "200" ]; then
    echo "✓ الخادم جاهز (محاولة $ATTEMPT): $(curl -s http://localhost:3100/api/health)"
    exit 0
  fi
  echo "… المحاولة $ATTEMPT فشلت (رمز $CODE) — إعادة التشغيل"
done
echo "✗ الخادم لم يجهز — راجع /tmp/dev-reset.log"
exit 1
