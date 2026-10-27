// HRMP — «مساعد HRMP»: واجهة الشات بوت (جولة 2026-10-28 — طلب المالك)
// ─────────────────────────────────────────────────────────────────────────────
// عقد العامل (infra/cloudflare/hrmp-assistant/README.md): الرد بلغة المستخدم ·
// حصرًا في المنصة وخصائصها ووظائفها · لا روابط · لا أسئلة عامة · لا هلوسة ·
// نموذج مجاني (Workers AI على حساب الذكاء المستقل — بلا أسرار هنا).
//
// دور هذا المسار:
//   1) طبقة المصداقية الوحيدة: جلسة الخادم (الدور) + كوكي اللغة + IP — العميل لا يزوّر شيئًا.
//   2) تحديد المعدل الموثوق (نافذة منزلقة في خادم واحد — SPEC §6؛ تحديد العامل داخل
//      عزول متعددة «أفضل جهد» فقط).
//   3) سقوف إدخال صارمة ثم تمرير نظيف إلى العامل عبر HRMP_ASSISTANT_URL
//      (افتراضي مدمج — نفس نمط HRMP_REFERENCE_ORIGIN: بلا أسرار، قابل للتغيير بلا كود).
//   4) خريطة أخطاء مستقرة يعرفها الودجت ويترجمها بأربع لغات (rate_limited/ai_unavailable/…).
//
// عام للجميع: زوار الصفحات العامة (الدليل/الوظائف) يجدون فيه التوجيه — لا يفتح بيانات
// ولا ينفذ شيئًا؛ كل معرفاته كتالوج خصائص عام داخل العامل.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRawSession, requestMeta } from "@/lib/auth/session";
import { getUiLocale } from "@/i18n/ui-locale";
import { rateLimit } from "@/lib/rate-limit";

// سقوف الخدمة (متغايرة عن سقوف العامل عمدًا — طبقتان لا واحدة)
const MAX_MESSAGES = 10;
const MAX_CONTENT_CHARS = 1500;
const RATE_LIMIT = 8; // رسائل/دقيقة لكل مستخدم أو IP
const RATE_WINDOW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;

const assistantInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CONTENT_CHARS),
      })
    )
    .min(1)
    .max(MAX_MESSAGES),
  // سياق العميل (اختياري — يُطهَّر): الصفحة الحالية لإجابات أدق
  page: z.string().max(160).optional(),
});

function assistantUrl(): string {
  return (process.env.HRMP_ASSISTANT_URL || "https://hrmp-assistant.balbolghol-ai.workers.dev").replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    // ── 1) السياق من الخادم حصرًا: الجلسة الخفيفة + اللغة + IP ──
    const [session, locale, meta] = await Promise.all([getRawSession(), getUiLocale(), requestMeta()]);
    const rlKey = `assistant:${session?.sub ?? meta.ip ?? "anonymous"}`;
    const rl = rateLimit(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // ── 2) تحقق الإدخال ──
    const parsed = assistantInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // ── 3) نداء العامل (النموذج المجاني) بمهلة صريحة ──
    const upstream = await fetch(`${assistantUrl()}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locale,
        role: session?.role ?? "visitor",
        page: parsed.data.page,
        messages: parsed.data.messages,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // 429 من العامل (تحديده الداخلي) يمر كما هو — الودجت يترجم الرسالة
    if (upstream.status === 429) {
      return NextResponse.json({ error: "rate_limited", retryAfterMs: RATE_WINDOW_MS }, { status: 429 });
    }
    if (upstream.status === 503 || upstream.status === 502) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: "assistant_error" }, { status: 502 });
    }
    const data = (await upstream.json().catch(() => null)) as { reply?: unknown } | null;
    if (!data || typeof data.reply !== "string" || data.reply.trim().length === 0) {
      return NextResponse.json({ error: "assistant_error" }, { status: 502 });
    }

    // «لا روابط» تحقَّق مرة ثالثة هنا (طبقة أخيرة داخل التطبيق — دفاع متعدد الطبقات)
    const sanitized = data.reply
      .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return NextResponse.json({ reply: sanitized });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 504 });
    }
    console.error("[api/assistant]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
