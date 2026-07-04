"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Locale, translator } from "./dictionaries";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (k: string) => string };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children, initial = "pt" }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem("fh.locale")) as Locale | null;
    if (saved) setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("fh.locale", l);
    document.documentElement.lang = l;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translator(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
