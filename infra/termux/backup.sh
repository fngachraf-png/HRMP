#!/usr/bin/env bash
# FWMS — (توافق) يوجّه إلى السكربت الموحّد backup-db.sh
# كان هذا الملف نسخة مبدئية بسيطة؛ صار غلافًا للحفاظ على أي استخدام قديم.
exec "$(dirname "${BASH_SOURCE[0]}")/backup-db.sh" "$@"
