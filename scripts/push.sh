#!/usr/bin/env bash
# FWMS — دفع main والوسوم إلى GitHub (للمساعدَين الآليَين — COORDINATION §5)
# الاستخدام:
#   FWMS_GITHUB_TOKEN=ghp_xxxxxxxxxxxx ./scripts/push.sh
# التوكن يُمرَّر كمتغير بيئة فقط ولا يُكتب في أي ملف مرفوع أبدًا (DEPLOYMENT §4).
# لا force-push إلى main — هذا السكربت يدفع فقط للأمام.
set -euo pipefail

TOKEN="${FWMS_GITHUB_TOKEN:?FWMS_GITHUB_TOKEN غير مضبوط — مرّر توكن GitHub كمتغير بيئة}"
REMOTE="${FWMS_REMOTE:-https://github.com/tarikchouika/F-W-M-S.git}"

AUTH_REMOTE="${REMOTE/https:\/\//https:\/\/x-access-token:${TOKEN}@}"

echo "→ دفع main والوسوم إلى ${REMOTE} ..."
git push "$AUTH_REMOTE" main --tags
echo "✓ تم الدفع. تحقق من CI: https://github.com/tarikchouika/F-W-M-S/actions"
