// FWMS i18n — محمّل القواميس في الخادم (استيراد ثابت = يعمل على Vercel وTermux معًا)
import type { Locale } from "./config";
import ar from "./dictionaries/ar.json";
import fr from "./dictionaries/fr.json";
import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";

export type Dictionary = typeof ar;

const dictionaries: Record<Locale, Dictionary> = {
  ar,
  fr: fr as unknown as Dictionary,
  en: en as unknown as Dictionary,
  es: es as unknown as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.ar;
}

/** الترجمة داخل الخادم بمفتاح شجرة نقاط: t(dict, "nav.login") */
export function tServer(dict: Dictionary, key: string): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict as unknown);
  return typeof value === "string" ? value : key;
}
