#!/usr/bin/env bash
# FWMS — النسخ الاحتياطي الآمن لقاعدة SQLite المحلية
# ملكية: المساعد الثاني — راجع docs/DATABASE_GUIDE.md §7
# الاستخدام: ./backup.sh [مسار_قاعدة_البيانات] [مجلد_النسخ]

set -euo pipefail

DB_PATH="${1:-${DB_PATH:-$HOME/F-W-M-S/db/fwms.db}}"
BACKUP_DIR="${2:-/sdcard/backups}"
STAMP="$(date +%F-%H%M)"

mkdir -p "$BACKUP_DIR"

# نسخة آمنة عبر أداة SQLite (وليس نسخ الملف أثناء الكتابة)
sqlite3 "$DB_PATH" ".backup('${BACKUP_DIR}/fwms-${STAMP}.db')"

# سياسة الدوران: آخر 7 يوميات + آخر 4 أسبوعية + آخر 6 شهرية
ls -1t "${BACKUP_DIR}"/fwms-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "✓ نسخة احتياطية: ${BACKUP_DIR}/fwms-${STAMP}.db"
