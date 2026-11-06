import { getLocale } from "@/server/i18n";
import { setLanguage } from "@/server/modules/settings/actions";

const LABELS = { en: "EN", it: "IT" } as const;

export async function LanguageSwitch() {
  const current = await getLocale();
  return (
    <form action={setLanguage} className="flex overflow-hidden rounded-full border border-(--line) bg-white">
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          aria-pressed={current === locale}
          aria-label={locale === "en" ? "English" : "Italiano"}
          className={`h-10 min-w-12 px-3 text-sm font-semibold transition ${
            current === locale ? "bg-(--teal) text-white" : "text-(--muted) hover:text-(--ink)"
          }`}
        >
          {LABELS[locale]}
        </button>
      ))}
    </form>
  );
}
