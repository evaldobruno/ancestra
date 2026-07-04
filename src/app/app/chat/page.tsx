"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isSupabaseConfigured } from "@/lib/queries";
import { getGeneralChatId, fetchMessages, sendMessage, type ChatMessage } from "@/lib/chat";

export default function Chat() {
  const { t, locale } = useI18n();
  const pt = locale === "pt";
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const configured = isSupabaseConfigured();

  async function refresh(id: string) {
    setMessages(await fetchMessages(id));
  }

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let timer: any;
    (async () => {
      const id = await getGeneralChatId();
      setChatId(id);
      if (id) await refresh(id);
      setLoading(false);
      if (id) timer = setInterval(() => refresh(id), 4000); // simple live updates
    })();
    return () => timer && clearInterval(timer);
  }, [configured]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!draft.trim() || !chatId) return;
    const body = draft;
    setDraft("");
    const res = await sendMessage(chatId, body);
    if (res.ok) refresh(chatId);
    else { setDraft(body); alert(res.error || "Erro"); }
  }

  const timeStr = (s: string) =>
    new Date(s).toLocaleString(pt ? "pt-PT" : "en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">{t("nav.chat")}</h1>
      <p className="mb-4 text-sm text-stone-400">
        {pt ? "Conversa partilhada por toda a família." : "A chat shared by the whole family."}
      </p>

      <div className="card flex h-[70vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pb-3">
          {!configured ? (
            <div className="flex h-full items-center justify-center text-center text-stone-400">
              {pt ? "Disponível depois de iniciar sessão." : "Available once signed in."}
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-stone-400">{pt ? "A carregar…" : "Loading…"}</div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-stone-400">
              {pt ? "Sem mensagens ainda. Escreve a primeira 👇" : "No messages yet. Write the first one 👇"}
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${m.mine ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-900"}`}>
                  {!m.mine && <div className="text-xs font-semibold text-brand-600 dark:text-brand-300">{m.sender_name}</div>}
                  <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  <div className={`mt-0.5 text-[10px] ${m.mine ? "text-white/70" : "text-stone-400"}`}>{timeStr(m.created_at)}</div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t border-brand-100 pt-3 dark:border-brand-800">
          <input className="input" placeholder={pt ? "Escrever mensagem…" : "Write a message…"} value={draft}
            disabled={!configured || !chatId}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn-primary" onClick={send} disabled={!configured || !chatId || !draft.trim()}>➤</button>
        </div>
      </div>
    </div>
  );
}
