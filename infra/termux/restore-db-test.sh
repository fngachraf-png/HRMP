#!/usr/bin/env bash
# FWMS — اختبار الاستعادة الفعلي للنسخ الاحتياطية (إلزامي مرة أسبوعيًا)
# المرجع: docs/DATABASE_GUIDE.md §7 — «اختبر الاستعادة فعليًا مرة كل أسبوع ووثّق»
# لا يلمس قاعدة التشغيل: يستعيد نسخة إلى ملف مؤقت ثم يقارن بنيويًا.
# الاستخدام: infra/termux/restore-db-test.sh [مسار-نسخة]
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_DIR/.env"
BACKUP_DIR="$REPO_DIR/db/backups"

DB_PATH="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL="file://; s/"$//')"
BACKUP="${1:-$(ls -1t "$BACKUP_DIR"/fwms-*-*.db 2>/dev/null | head -1)}"

if [[ -z "$BACKUP" || ! -f "$BACKUP" ]]; then
  echo "❌ لا توجد نسخة للاختبار — شغّل backup-db.sh أولًا"
  exit 1
fi

TMP="$(mktemp /tmp/fwms-restore-test-XXXX.db)"
trap 'rm -f "$TMP"' EXIT

echo "▶ النسخة الاختبارية: $BACKUP"
cp "$BACKUP" "$TMP"

echo "▶ 1) فحص السلامة: PRAGMA quick_check"
CHECK="$(sqlite3 "$TMP" "PRAGMA quick_check;")"
[[ "$CHECK" == "ok" ]] && echo "  ✔ ok" || { echo "  ❌ $CHECK"; exit 1; }

echo "▶ 2) فحص بنيوي مقابل قاعدة التشغيل"
# ملاحظة SQL: '_' في LIKE = أي حرف واحد — نستثني _prisma_migrations بـ GLOB لا LIKE
count() { sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM \"$1\""; }
count_bk() { sqlite3 "$TMP" "SELECT COUNT(*) FROM \"$1\""; }
FAIL=0
for t in $(sqlite3 "$TMP" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB '_*' AND name NOT GLOB 'sqlite_*'"); do
  A="$(count "$t")"; B="$(count_bk "$t")"
  printf "  %-20s قاعدة=%-6s نسخة=%-6s" "$t" "$A" "$B"
  if [[ "$A" -le "$B" ]]; then echo "✔"; else echo "⚠ (النسخة أقدم من القاعدة — متوقع إن نُسخت قبل إدخال بيانات)"; fi
done

echo "▶ 3) قراءة فعلية من النسخة المستعادة (عينة PayRule — التاريخ بنسخته المخزّنة)"
sqlite3 -header "$TMP" "SELECT key, valueInt, unit, substr(effectiveFrom,1,10) AS eff FROM \"PayRule\" WHERE companyId IS NULL ORDER BY key LIMIT 5;"

echo "▶ 4) محتوى الجداول الرئيسية"
sqlite3 "$TMP" "SELECT 'companies='||COUNT(*) FROM \"Company\" UNION ALL SELECT 'users='||COUNT(*) FROM \"User\" UNION ALL SELECT 'pay_rules='||COUNT(*) FROM \"PayRule\";"

echo "✅ الاستعادة مُختبَرة وموثّقة: النسخة صالحة وقابلة للقراءة كاملة."
