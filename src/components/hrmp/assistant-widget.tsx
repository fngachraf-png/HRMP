"use client";

// HRMP — «مساعد HRMP»: ودجت الشات الموجَّه (جولة 2026-10-28 — طلب المالك)
// ─────────────────────────────────────────────────────────────────────────────
// زر عائم باللوغو الرسمي وألوان الهوية (كحلي + ذهبي — logo.tsx/globals.css) في
// كل صفحات المنصة (مركَّب في layout الجذر): يساعد الزوار والمستخدمين على
// الاستخدام الاحترافي. العقد: الرد بلغة المستخدم · حصرًا في المنصة وخصائصها ·
// بلا روابط · لا أسئلة عامة · لا هلوسة — تفرضها طبقات العامل
// (infra/cloudflare/hrmp-assistant) عبر نموذج مجاني، وهذا الودجت واجهة فقط:
// كل الأدوار واللغات والمعدلات يقررها الخادم في /api/assistant.
//
// ملاحظات تصميمية:
//   · التحديد المنطقي inset-inline-end (Tailwind «end») — يسارًا في RTL العربية تلقائيًا.
//   · داخل ThemeProvider في layout الجذر ⇒ يبقى مثبتًا عبر التنقل الناعم (state يبقى).
//   · نصوص الودجت كلها من قواميس i18n الأربعة (لا نص ثابت في الكود — قاعدة نافذة).
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RotateCcw, Send, X } from "lucide-react";
import { HrmpLogo } from "@/components/hrmp/logo";
import { useI18n } from "@/i18n/provider";

type ChatMessage = { role: "user" | "assistant"; content: string };

const ERROR_BY_CODE: Record<string, string> = {
  rate_limited: "assistant.errors.rateLimited",
  ai_unavailable: "assistant.errors.unavailable",
  invalid_input: "assistant.errors.generic",
  assistant_error: "assistant.errors.generic",
  internal_error: "assistant.errors.generic",
};

export function AssistantWidget() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // آخر ما يظهر أولًا — أسئلة مقترحة بأربع لغات من القواميس
  const suggestions = [t("assistant.s1"), t("assistant.s2"), t("assistant.s3")];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setErrorKey(null);
      const history = [...messages, { role: "user" as const, content: text }].slice(-10);
      setMessages(history);
      setInput("");
      setSending(true);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history, page: pathname ?? undefined }),
        });
        const data = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null;
        if (res.ok && data?.reply) {
          const reply: string = data.reply; // التصريح المحلي يحفظ تضييق النوع داخل الإغلاق
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        } else {
          const code = data?.error ?? "internal_error";
          setErrorKey(ERROR_BY_CODE[code] ?? "assistant.errors.generic");
        }
      } catch {
        setErrorKey("assistant.errors.unavailable");
      } finally {
        setSending(false);
      }
    },
    [messages, pathname, sending]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setErrorKey(null);
  }, []);

  return (
    <>
      {/* الزر العائم — لوغو المنصة الرسمي بألوان الهوية (كحلي/ذهبي) */}
      {!open && (
        <button
          type="button"
          aria-label={t("assistant.launcher")}
          title={t("assistant.launcher")}
          onClick={() => setOpen(true)}
          className="group fixed bottom-4 end-4 z-50 size-14 rounded-[22%] overflow-hidden
                     bg-[var(--hrmp-navy)] ring-2 ring-[var(--hrmp-gold)] shadow-[0_6px_20px_-6px_rgba(11,27,51,0.65)]
                     transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--hrmp-gold)]"
        >
          <span className="flex size-full items-center justify-center">
            <HrmpLogo className="size-11 rounded-[18%]" />
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[22%]
                       bg-[var(--hrmp-gold)] opacity-0 transition-opacity duration-300 group-hover:opacity-15"
          />
        </button>
      )}

      {/* لوحة المحادثة */}
      {open && (
        <div
          role="dialog"
          aria-label={t("assistant.title")}
          className="fixed bottom-4 end-4 z-50 flex h-[min(70dvh,560px)] w-[min(92vw,380px)]
                     flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground
                     shadow-[0_18px_50px_-12px_rgba(11,27,51,0.55)]"
        >
          {/* الرأس: كحلي بلمسة ذهبية + لوغو + عنوان + أدوات */}
          <div className="flex items-center gap-3 bg-[var(--hrmp-navy)] px-3 py-2.5 text-white">
            <HrmpLogo className="size-9 shrink-0 rounded-[22%]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{t("assistant.title")}</p>
              <p className="truncate text-[11px] leading-tight text-white/70">{t("assistant.subtitle")}</p>
            </div>
            <button
              type="button"
              aria-label={t("assistant.reset")}
              title={t("assistant.reset")}
              onClick={reset}
              className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("assistant.close")}
              title={t("assistant.close")}
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* المحادثة */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">{t("assistant.disclaimer")}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-[var(--hrmp-gold)]/45 bg-[var(--hrmp-gold-soft)]
                             px-3 py-1.5 text-xs text-foreground transition-colors
                             hover:border-[var(--hrmp-gold)] hover:bg-[var(--hrmp-gold)]/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <HrmpLogo className="me-2 mt-0.5 size-7 shrink-0 self-start rounded-[22%]" />
                )}
                <div
                  dir="auto"
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed
                    ${
                      m.role === "user"
                        ? "rounded-ee-sm bg-[var(--hrmp-navy)] text-white"
                        : "rounded-es-sm bg-muted text-foreground"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HrmpLogo className="size-7 shrink-0 rounded-[22%] opacity-70" />
                <span className="animate-pulse">{t("assistant.thinking")}</span>
              </div>
            )}
            {errorKey && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {t(errorKey)}
              </p>
            )}
          </div>

          {/* الإدخال */}
          <div className="border-t bg-card px-3 py-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={t("assistant.placeholder")}
                rows={1}
                dir="auto"
                maxLength={1500}
                className="max-h-28 min-h-9 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-xs
                           focus-visible:outline-2 focus-visible:outline-[var(--hrmp-gold)]"
              />
              <button
                type="submit"
                disabled={sending || input.trim().length === 0}
                aria-label={t("assistant.send")}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl
                           bg-[var(--hrmp-navy)] text-white transition-all
                           hover:bg-[var(--hrmp-navy-deep)] disabled:opacity-40"
              >
                <Send className="size-4 rtl:-scale-x-100" aria-hidden />
              </button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">{t("assistant.disclaimer")}</p>
          </div>
        </div>
      )}
    </>
  );
}
