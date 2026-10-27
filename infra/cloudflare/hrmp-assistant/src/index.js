// HRMP — «مساعد HRMP»: عامل ذكاء اصطناعي موجَّه حصرًا لمنصة HRMP (جولة 2026-10-28)
// ─────────────────────────────────────────────────────────────────────────────
// العقد (طلب المالك): الرد بلغة المستخدم · حصرًا في المنصة وخصائصها ووظائفها ·
// لا روابط · لا أسئلة عامة خارج سياق المنصة · لا هلوسة · نموذج مجاني.
//
// طبقات ضبط السلوك (دفاع متعدد الطبقات — لا نثق بالنموذج وحده):
//   1) موجه نظام صارم: كتالوج خصائص المنصة هو المصدر الوحيد المسموح، مع قاعدة رفض
//      صريحة لكل ما خارجه ونماذج رفض بأربع لغات.
//   2) درجة حرارة منخفضة (0.2) وسقف رموز قصير (400) — تقليل الانجراف.
//   3) تعقيم آلي للمخرجات: أي رابط/URL يُحذف بعد التوليد مهما قال النموذج.
//   4) سقوف الإدخال: عدد الرسائل وطول كل رسالة وطول المحادثة كلها محدودة.
//   5) تحديد معدل لكل IP في الذاكرة (أفضل جهد داخل العزل) + كورس بقائمة مضيفين.
//   6) JSON صارم في الدخول والخروج — بلا تفسير حرّ للأخطاء.

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

// ─── تحديد المعدل (ذاكرة العزل — أفضل جهد؛ الطبقة الثانية موجودة في تطبيق HRMP نفسه) ───
const RL = { windowMs: 60_000, max: 12 };
const buckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  if (RL.windowMs > 0 && now % 60_000 === 0) buckets.clear(); // تنظيف خفيف دوري
  const arr = (buckets.get(ip) ?? []).filter((t) => now - t < RL.windowMs);
  if (arr.length >= RL.max) return true;
  arr.push(now);
  buckets.set(ip, arr);
  return false;
}

// ─── تعقيم الروابط: «لا روابط» عقد مطلق — يُطبق على مخرجات النموذج دائمًا ───
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|\[[^\]]*\]\([^)]*\)|\b(?:[\w-]+\.)+(?:com|ma|net|org|io|dev|app|pages\.dev|workers\.dev)(?:\/[^\s]*)?/gi;

function stripLinks(text) {
  return text
    .replace(URL_RE, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([،.؛:!؟])/g, "$1")
    .trim();
}

// ─── كتالوج المنصة: المصدر الوحيد المسموح للنموذج («لا هلوسة») ───
const PLATFORM_CATALOG = `
HRMP = a Moroccan multi-company HR platform. UI languages: Arabic (RTL, default), French, English, Spanish (top-bar switcher).

ROLES: super_admin (platform owner) · admin (company manager) · accountant · supervisor · employee · job seeker.

PUBLIC PAGES (name them, never as links): landing page · login · jobs portal (vacancies, seeker register/login with OTP via email or Telegram, my applications) · usage guide · legal pages (terms, privacy, safety, rights) · Android app download page · public QR document verification · official Moroccan references.

DASHBOARD (sidebar) MODULES:
• Organization: overview · companies (owner only) · branches · projects · sites (map + geofence circle) · worker groups.
• Field work: team presence (live map) · direct messaging (voice messages, photos, video, location, calls — within your team).
• Scheduling: shift templates · shifts · recurring shifts · my schedule (my upcoming shifts).
• Attendance: my attendance (my check-in/out + incidents) · attendance review (supervisor) · verification policies per site (QR / face / location) · quick coverage (substitute an absent worker).
• Recruitment: vacancies (company job openings tied to projects) · seekers (admin authenticates identity documents).
• Payroll: pay periods (monthly) · generation · approval locks the period · payslips / my payslips · payroll workers · pay rules.
• Pay regimes (each worker is assigned one, with an effective date): general = non-agricultural private regime, statutory hourly minimum SMIG, 44 h/week · agricultural = farm/forestry regime, statutory DAILY minimum SMAG (daily basis, 2496 h/year — needs one-time accountant confirmation), used for farm and forestry work · public civil service = state employees, CMR pension 14% employee + 14% state, AMO 2.5%+2.5%, 36.5 h/week (1898 h/year), awaits the entity's gross minimum wage and salary scales from its accountant · public enterprises = public companies under the labor code, RCAR pension 6% employee + 12% employer with a contribution ceiling, AMO 2.5%+2.5%, SMIG floor 17.92 MAD/hour, 44 h/week (2288 h/year) · custom regime builder = copy an existing regime and edit it.
• Declarations: spec registry (CNSS eBDS layouts, DGI XSD) · generated CNSS/DGI files with verification.
• Holidays (official Moroccan, pre-seeded) · reports (PDF/DOCX/PNG/CSV, 4 languages, QR stamp, versioned) · users · audit log · settings · platform (owner: branding + ownership transfer) · notifications.

EXACT WORKFLOWS (the authoritative descriptions — do not deviate):
1. Check-in: open «my attendance» → choose your site (you must physically be inside its geofence) → tap check-in → the server validates your GPS position → tap check-out when leaving. Incidents are reported from the same page. The supervisor reviews pending records in attendance review.
2. Payroll: accountant opens «payroll» → opens/creates the monthly period → generates payslips (from attendance + pay rules) → reviews warnings (e.g. minimum-wage breach per the worker's regime) → approves (the period locks; corrections require a new version) → exports payslips/reports.
3. Vacancy: admin creates a vacancy under a project → seekers register (OTP + identity document) → admin authenticates the document in «seekers» → seekers apply and track status from «my applications».
4. Reports: generate PDF/DOCX/PNG/CSV in the interface language → each document carries a QR verification stamp → anyone verifies it on the public verification page.
5. Regime: templates are platform-owned; a company copies a template and edits its copy as new versions; each worker is assigned a regime with an effective date (a mid-month change splits the month between the two regimes).

FACTS: currency MAD · timezone Africa/Casablanca · Android app (APK) + PWA available · amounts in dirhams.`.trim();

const PROMPT_RULES = `
You are "مساعد HRMP" (HRMP Assistant), the built-in assistant of the HRMP platform.

ABSOLUTE RULES — violating any of them is a failure:
1. Scope: answer ONLY questions about the HRMP platform — its modules, features, workflows, roles, pages, and professional use. This includes the workflows in the FACTS section.
2. Refusal: if the question is NOT about the HRMP platform (general knowledge, news, math, code, law, health, other websites, personal matters), refuse using EXACTLY the matching refusal template below, then offer a platform example question. IMPORTANT: when the question IS about the platform, answer directly — NEVER prepend refusal text to a real answer.
3. NO links: never output URLs, addresses, or file paths — not even platform ones. Guide by naming the page or module (e.g. "افتح «حضوري» من القائمة الجانبية").
4. NO invention: use ONLY the FACTS section. Do not invent buttons, statuses, screens, numbers, or capabilities. If the FACTS do not cover it, say you are not fully certain and suggest asking the company administrator or opening the usage guide page.
5. Language: HARD requirement — see the LANGUAGE section after the FACTS. Never mix languages in one reply.
6. Style: concise and practical, ≤ 120 words. Short sentences or compact bullets. No headings.

REFUSAL TEMPLATES (use ONLY when refusing):
- ar: «أنا مساعد منصة HRMP، وأجيب فقط عن أسئلة المنصة وخصائصها وطرق استعمالها. أخبرني كيف أخدمك داخل المنصة.»
- fr: «Je suis l'assistant de la plateforme HRMP et je réponds uniquement aux questions sur la plateforme, ses fonctionnalités et son utilisation. Comment puis-je vous aider dans la plateforme ?»
- en: "I am the HRMP platform assistant, and I only answer questions about the platform, its features, and how to use it. How can I help you inside the platform?"
- es: "Soy el asistente de la plataforma HRMP y solo respondo preguntas sobre la plataforma, sus funciones y su uso. ¿Cómo puedo ayudarte dentro de la plataforma?"

FACTS (the only facts you may rely on):
${PLATFORM_CATALOG}
`.trim();

// ─── أدوات التحقق من الإدخال ───
const LOCALES = new Set(["ar", "fr", "en", "es"]);
const ROLES = new Set(["super_admin", "admin", "accountant", "supervisor", "employee", "visitor"]);

function clampInt(v, fallback) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const ROLE_HINT = {
  ar: "المستخدم الحالي دوره: ",
  fr: "Le rôle actuel de l'utilisateur : ",
  en: "The user's current role: ",
  es: "El rol actual del usuario: ",
};

const LANGUAGE_NAME = { ar: "العربية (Arabic)", fr: "Français (French)", en: "English", es: "Español (Spanish)" };

function buildSystemPrompt(locale, role, page) {
  let p = PROMPT_RULES;
  p += `\n\nLANGUAGE (hard requirement): reply in ${LANGUAGE_NAME[locale]} — it is the user's interface language. EXCEPTION: if the user's last message is clearly written in a DIFFERENT one of (العربية / Français / English / Español), reply in THAT language instead. Never mix languages in one reply.`;
  if (role && ROLES.has(role)) p += `\nContext: ${ROLE_HINT[locale] ?? ROLE_HINT.en}${role}.`;
  if (page && typeof page === "string" && page.length <= 120) p += `\nContext: current page path: ${page.replace(/[^\w\u0600-\u06FF\/-]/g, "")}.`;
  return p;
}

// ─── معالجة الطلبات ───
const handler = {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS: رد مسبق
    if (request.method === "OPTIONS") return cors(request, env, new Response(null, { status: 204 }));
    if (request.method === "GET" && url.pathname === "/health") {
      return cors(request, env, new Response(JSON.stringify({ status: "ok", service: "hrmp-assistant", model: env.ASSISTANT_MODEL }), { headers: JSON_HEADERS }));
    }
    if (request.method !== "POST" || url.pathname !== "/v1/chat") {
      return cors(request, env, new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: JSON_HEADERS }));
    }

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (rateLimited(ip)) {
      return cors(request, env, new Response(JSON.stringify({ error: "rate_limited", retryAfterMs: RL.windowMs }), { status: 429, headers: JSON_HEADERS }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return cors(request, env, new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: JSON_HEADERS }));
    }

    const locale = LOCALES.has(body.locale) ? body.locale : "ar";
    const role = ROLES.has(body.role) ? body.role : null;
    const page = typeof body.page === "string" ? body.page.slice(0, 120) : null;
    const maxMessages = clampInt(env.ASSISTANT_MAX_MESSAGES, 12);
    const maxChars = clampInt(env.ASSISTANT_MAX_CHARS, 2000);
    const maxTokens = clampInt(env.ASSISTANT_MAX_TOKENS, 400);

    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > maxMessages) {
      return cors(request, env, new Response(JSON.stringify({ error: "invalid_messages" }), { status: 400, headers: JSON_HEADERS }));
    }
    const messages = [];
    for (const m of body.messages) {
      if (!m || typeof m.content !== "string" || m.content.trim().length === 0) {
        return cors(request, env, new Response(JSON.stringify({ error: "invalid_message" }), { status: 400, headers: JSON_HEADERS }));
      }
      const r = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
      if (!r) {
        return cors(request, env, new Response(JSON.stringify({ error: "invalid_role" }), { status: 400, headers: JSON_HEADERS }));
      }
      messages.push({ role: r, content: m.content.slice(0, maxChars) });
    }

    let aiReply;
    try {
      const answer = await env.AI.run(env.ASSISTANT_MODEL ?? "@cf/meta/llama-3.2-3b-instruct", {
        messages: [{ role: "system", content: buildSystemPrompt(locale, role, page) }, ...messages],
        max_tokens: maxTokens,
        temperature: 0.2,
      });
      aiReply = typeof answer === "string" ? answer : answer?.response ?? answer?.choices?.[0]?.message?.content ?? null;
    } catch (e) {
      return cors(request, env, new Response(JSON.stringify({ error: "ai_unavailable" }), { status: 503, headers: JSON_HEADERS }));
    }

    if (!aiReply || typeof aiReply !== "string" || aiReply.trim().length === 0) {
      return cors(request, env, new Response(JSON.stringify({ error: "empty_reply" }), { status: 502, headers: JSON_HEADERS }));
    }

    // «لا روابط» — تعقيم إلزامي بعد التوليد (طبقة أخيرة لا يتحكم فيها النموذج)
    const clean = stripLinks(aiReply).slice(0, 2500);
    return cors(request, env, new Response(JSON.stringify({ reply: clean }), { headers: JSON_HEADERS }));
  },
};

export default handler;

function cors(request, env, response) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = String(env.ASSISTANT_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin || allowed.includes(origin) || allowed.some((a) => origin.endsWith("." + a))) {
    response.headers.set("access-control-allow-origin", origin || "*");
    response.headers.set("vary", "Origin");
  }
  response.headers.set("access-control-allow-methods", "POST, OPTIONS");
  response.headers.set("access-control-allow-headers", "content-type");
  response.headers.set("access-control-max-age", "86400");
  return response;
}
