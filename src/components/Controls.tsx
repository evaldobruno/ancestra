"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES } from "@/i18n/dictionaries";
import { useTheme } from "@/components/Providers";

export function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value as any)}
      className="rounded-lg border border-brand-200 bg-white/70 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800"
    >
      {LOCALES.filter((l) => l.enabled).map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme" className="btn-ghost px-3 py-1.5 text-sm">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
