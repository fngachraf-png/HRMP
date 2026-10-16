# FWMS — نظام إدارة القوى العاملة الميدانية

منصة رقمية مغربية **متعددة الشركات** لإدارة العمالة الميدانية (حراسة، نظافة، بستنة، بناء، حرفيون): حضور جغرافي دقيق (Geofencing)، جدولة ذكية، أجور بقواعد مدونة الشغل المغربية (CNSS/AMO/IR)، وتصاريح رسمية — بأربع لغات (العربية RTL، الفرنسية، الإنجليزية، الإسبانية).

## البنية

```
GitHub (tarikchouika/F-W-M-S) ── push ──▶ Vercel (النشر السحابي)
                                              │
                        Cloudflare (DNS + Tunnel)
                                              │
        الخادم المحلي: Samsung A53 5G — Termux/Ubuntu + SQLite
```

## التشغيل السريع

```bash
git clone https://github.com/tarikchouika/F-W-M-S.git
cd F-W-M-S
cp .env.example .env        # عدّل القيم
npm install                 # أو bun install
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
```

فحص الصحة: `GET /api/health`

## الوثائق (اقرأ بهذا الترتيب)

| الملف | الغرض |
|---|---|
| `AGENTS.md` | حوكمة العمل لكل مساعد آلي — **ابدأ هنا** |
| `KNOWLEDGE_BASE.md` | المعرفة المشتركة الحية |
| `CHANGELOG.md` | سجل التغييرات |
| `docs/SPEC.md` | المواصفة المرجعية الكاملة للمنتج |
| `docs/COORDINATION.md` | تنسيق المساعدين الآليين |
| `docs/DATABASE_GUIDE.md` | قاعدة البيانات المحلية (Termux/SQLite) |
| `docs/DEPLOYMENT.md` | النشر (Vercel + Cloudflare) |
| `docs/WORKLOG.md` | سجل جلسات العمل |

## الحزمة التقنية

Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Prisma ORM + SQLite · JWT Auth · Zustand · TanStack Query

## الحالة

المرحلتان 0 و1 منجزتان (v0.1.0): الأساس + الهوية والصلاحيات وتعدد الشركات. خارطة المراحل الكاملة في `AGENTS.md §4`.

## الترخيص والملكية

ملكية المنصة قابلة للتخصيص والنقل (white-label) وفق المواصفة §3.2. جميع العلامات التجارية لأصحابها.
