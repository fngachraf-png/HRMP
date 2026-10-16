// FWMS i18n — الإعدادات المركزية (SPEC §2: أربع لغات، العربية RTL افتراضية)
export const locales = ["ar", "fr", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

export const localeLabels: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
  es: "Español",
};

export const LOCALE_COOKIE = "FWMS_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}
