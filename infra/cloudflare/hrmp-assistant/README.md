# hrmp-assistant — «مساعد HRMP» (عامل الذكاء الموجَّه)

> **جولة 2026-10-28 — طلب المالك:** شات بوت داخل المنصة باسم «مساعد HRMP» يساعد ويوجّه المستخدم
> للاستخدام الاحترافي: الرد بلغة المستخدم، حصرًا في المنصة وخصائصها ووظائفها، بلا روابط،
> بلا أسئلة عامة خارج المنصة، بلا هلوسة، وبنموذج **مجاني**.

## المعمارية

```
واجهة المنصة (ودجت «مساعد HRMP» في كل الصفحات)
   │ POST /api/assistant            (تطبيق HRMP — تحقق جلسة + تحديد معدل موثوق)
   ▼
Worker hrmp-assistant (حساب الذكاء المستقل 02fcf958…)
   │ POST /v1/chat  →  Workers AI (@cf/meta/llama-3.1-8b-instruct-fp8 — مجاني ضمن الحصة اليومية 10k neurons)
   ▼
رد بلغة المستخدم، بلا روابط، داخل نطاق المنصة
```

- **العنوان:** `https://hrmp-assistant.balbolghol-ai.workers.dev` (الافتراضي في كود التطبيق —
  قابل للتغيير عبر `HRMP_ASSISTANT_URL` بلا تعديل كود، نفس نمط `HRMP_REFERENCE_ORIGIN`).
- **النموذج:** `@cf/meta/llama-3.1-8b-instruct-fp8` — يعمل داخل الحصة اليومية المجانية
  لحساب الذكاء (10,000 neurons/يوم ≈ مئات الردود يوميًا). التغيير: `ASSISTANT_MODEL` في
  `wrangler.toml` ثم `wrangler deploy`.
- **بلا أسرار في الكود إطلاقًا:** ربط `[ai]` يتكفل بالمصادقة داخل الحساب؛ التطبيق لا يحمل
  أي توكن.

## طبقات ضبط السلوك (دفاع متعدد الطبقات)

| الطبقة | أين | ماذا تفعل |
|---|---|---|
| كتالوج الخصائص | موجه النظام | المصدر الوحيد للوقائع («لا هلوسة») — كل ما خارجه يُرفض |
| قالب الرفض | موجه النظام | رفض موحَّد بأربع لغات لكل سؤال خارج المنصة |
| اللغة | موجه النظام | قيد صلب: لغة الواجهة، مع استثناء لغة رسالة المستخدم |
| درجة حرارة 0.2 + سقف 400 رمز | نداء النموذج | تقليل الانجراف والطول |
| تعقيم الروابط | بعد التوليد | أي URL/رابط يُحذف آليًا من المخرجات مهما قال النموذج |
| سقوف الإدخال | Worker | ≤ 12 رسالة × ≤ 2000 حرف، JSON صارم |
| CORS بقائمة مضيفين | Worker | hrmp.pages.dev / hrmp.vercel.app / fwms-dg8.pages.dev / fwms.tarikc.workers.dev / localhost |
| تحديد معدل | Worker + تطبيق HRMP | Worker: ~12 طلبًا/دقيقة لكل IP في ذاكرة العزل (أفضل جهد — الحد عبر عزول متعددة، الطبقة الموثوقة في خادم التطبيق) · التطبيق: نافذة منزلقة في الخادم الواحد |

## النشر والتحقق

```bash
cd infra/cloudflare/hrmp-assistant
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=02fcf95818efed008f495dd6e02c3ef6 npx wrangler deploy

# تحقق حي:
curl https://hrmp-assistant.balbolghol-ai.workers.dev/health
curl -X POST https://hrmp-assistant.balbolghol-ai.workers.dev/v1/chat \
  -H 'content-type: application/json' \
  -d '{"locale":"ar","messages":[{"role":"user","content":"كيف أسجل الحضور؟"}]}'
```

(نتائج التحقق الفعلي لهذه الجولة موثقة في `docs/WORKLOG.md` — 8 اختبارات حية ناجحة.)
