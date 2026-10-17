#!/usr/bin/env bash
# FWMS — نسخ الحزم الأصلية لـ sharp إلى مجلد standalone (الهاتف arm64)
# ملكية: المساعد الثاني — راجع docs/DATABASE_GUIDE.md §9.2
#
# السبب: سكربت build ينسخ node_modules/sharp وحدها، لكن sharp يحمّل محرّكها
# الأصلي من @img/sharp-<platform> (ملف ‎.node‎) + @img/sharp-libvips-<platform> (‎.so‎).
# بدونها يفشل كل توليد PNG بـ: Could not load the "sharp" module using the linux-arm64 runtime
# (مُثبت 2026-10-17 على v0.8.0 — التوليد عاد للعمل بعد النسخ).

set -euo pipefail

cd "$(dirname "$0")/../.."   # جذر المستودع

[ -d .next/standalone/node_modules ] || { echo "⚠ لا يوجد standalone — شغّل build أولًا"; exit 0; }

copied=0
for pkg in colour sharp-linux-arm64 sharp-libvips-linux-arm64 sharp-linuxmusl-arm64 sharp-libvips-linuxmusl-arm64; do
  src="node_modules/@img/$pkg"
  dst=".next/standalone/node_modules/@img/$pkg"
  [ -d "$src" ] || continue
  if [ ! -d "$dst" ] || [ -z "$(ls -A "$dst" 2>/dev/null)" ] || [ "$(find "$dst" -type f | wc -l)" -lt "$(find "$src" -type f | wc -l)" ]; then
    mkdir -p "$dst"
    cp -r "$src/." "$dst/"
    copied=$((copied + 1))
  fi
done

echo "✔ @img: $copied حزمة مُنزَّلة إلى standalone"

# تحقق تشغيلي حقيقي (لا ادعاء بلا تشغيل)
if ( cd .next/standalone && node -e "require('sharp'); console.log('✔ sharp يُحمَّل في standalone')" 2>/dev/null ); then
  :
else
  echo "⚠ sharp لا يزال يفشل — راجع node_modules/@img/sharp-linux-arm64/lib/"
  exit 1
fi
