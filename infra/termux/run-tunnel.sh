#!/usr/bin/env bash
# FWMS — تشغيل النفق الدائم (Cloudflare Tunnel) من الهاتف
# ملكية: المساعد الثاني — راجع docs/DATABASE_GUIDE.md §2.4
# المتطلب: CLOUDFLARE_TUNNEL_TOKEN في .env (لا يُرفع أبدًا)
# ملاحظة: النفق يعرّض خادم Next.js المحلي فقط — لا منافذ يدوية.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

TOKEN="$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' .env | head -1 | sed 's/^CLOUDFLARE_TUNNEL_TOKEN="//; s/"$//')"
if [[ -z "$TOKEN" ]]; then
  echo "❌ CLOUDFLARE_TUNNEL_TOKEN غير موجود في .env"
  exit 1
fi

# منع نوم الهاتف (إلزامي — وإلا يُقتل النفق)
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

# مؤقت: http2 للاستقرار — QUIC (مطلوب لـ VPC) لا يتصل من الشبكة الحالية (0 اتصالات). يُعاد تقييمه مع شبكة/حساب FWMS المستقل.
# ملاحظة: http2 كان أثبت أثناء الاختبار المبكر، لكن VPC لا يعمل معه — راجع KNOWLEDGE_BASE.
exec cloudflared --protocol http2 tunnel run --token "$TOKEN"
