// Lightweight i18n dictionary. PT + EN now; NL/ES/FR slots ready (spec §22).
// All UI labels go through t() so adding a language = adding a dictionary.

export type Locale = "pt" | "en" | "nl" | "es" | "fr";

export const LOCALES: { code: Locale; label: string; flag: string; enabled: boolean }[] = [
  { code: "pt", label: "Português", flag: "🇵🇹", enabled: true },
  { code: "en", label: "English", flag: "🇬🇧", enabled: true },
  { code: "nl", label: "Nederlands", flag: "🇳🇱", enabled: false },
  { code: "es", label: "Español", flag: "🇪🇸", enabled: false },
  { code: "fr", label: "Français", flag: "🇫🇷", enabled: false },
];

type Dict = Record<string, string>;

const pt: Dict = {
  "app.tagline": "A casa digital da sua família",
  "nav.dashboard": "Início",
  "nav.members": "Membros",
  "nav.tree": "Árvore",
  "nav.calendar": "Agenda",
  "nav.memories": "Memórias",
  "nav.memorial": "Memorial",
  "nav.chat": "Conversas",
  "nav.documents": "Documentos históricos",
  "nav.admin": "Administração",
  "nav.profile": "O meu perfil",
  "nav.signout": "Sair",

  "auth.signin": "Entrar",
  "auth.signup": "Criar conta",
  "auth.email": "Email",
  "auth.password": "Palavra-passe",
  "auth.name": "Nome completo",
  "auth.forgot": "Esqueceu a palavra-passe?",
  "auth.noaccount": "Ainda não tem conta?",
  "auth.haveaccount": "Já tem conta?",
  "auth.welcome": "Bem-vindo de volta",
  "auth.createTitle": "Junte-se à sua família",
  "auth.or": "ou",

  "dash.greeting": "Olá",
  "dash.upcomingBirthdays": "Próximos aniversários",
  "dash.upcomingEvents": "Próximos eventos",
  "dash.recentMemories": "Memórias recentes",
  "dash.pendingTasks": "Tarefas pendentes",
  "dash.onThisDay": "Neste dia",
  "dash.quickAdd": "Adicionar rápido",
  "dash.addEvent": "Novo evento",
  "dash.addMember": "Novo membro",
  "dash.addMemory": "Nova memória",
  "dash.openChat": "Abrir conversa",
  "dash.nothing": "Nada por aqui ainda.",

  "members.title": "Membros da família",
  "members.add": "Adicionar membro",
  "members.bornIn": "Nascido(a) em",
  "members.profession": "Profissão",
  "tree.title": "Árvore genealógica",
  "tree.immersive": "Modo imersivo",
  "tree.search": "Procurar pessoa…",
  "tree.export": "Exportar",
  "tree.generation": "Geração",

  "calendar.title": "Agenda familiar",
  "calendar.today": "Hoje",
  "memories.title": "Memórias & histórias",
  "memories.add": "Nova memória",

  "common.family": "Família",
  "common.viewProfile": "Ver perfil",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.search": "Pesquisar",
  "common.loading": "A carregar…",
  "common.demo": "Pré-visualização de demonstração",
  "status.alive": "Vivo",
  "status.deceased": "Falecido",
};

const en: Dict = {
  "app.tagline": "Your family's digital home",
  "nav.dashboard": "Home",
  "nav.members": "Members",
  "nav.tree": "Tree",
  "nav.calendar": "Calendar",
  "nav.memories": "Memories",
  "nav.memorial": "Memorial",
  "nav.chat": "Chat",
  "nav.documents": "Historical documents",
  "nav.admin": "Admin",
  "nav.profile": "My profile",
  "nav.signout": "Sign out",

  "auth.signin": "Sign in",
  "auth.signup": "Create account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "Full name",
  "auth.forgot": "Forgot your password?",
  "auth.noaccount": "Don't have an account?",
  "auth.haveaccount": "Already have an account?",
  "auth.welcome": "Welcome back",
  "auth.createTitle": "Join your family",
  "auth.or": "or",

  "dash.greeting": "Hello",
  "dash.upcomingBirthdays": "Upcoming birthdays",
  "dash.upcomingEvents": "Upcoming events",
  "dash.recentMemories": "Recent memories",
  "dash.pendingTasks": "Pending tasks",
  "dash.onThisDay": "On this day",
  "dash.quickAdd": "Quick add",
  "dash.addEvent": "New event",
  "dash.addMember": "New member",
  "dash.addMemory": "New memory",
  "dash.openChat": "Open chat",
  "dash.nothing": "Nothing here yet.",

  "members.title": "Family members",
  "members.add": "Add member",
  "members.bornIn": "Born in",
  "members.profession": "Profession",
  "tree.title": "Family tree",
  "tree.immersive": "Immersive mode",
  "tree.search": "Find a person…",
  "tree.export": "Export",
  "tree.generation": "Generation",

  "calendar.title": "Family calendar",
  "calendar.today": "Today",
  "memories.title": "Memories & stories",
  "memories.add": "New memory",

  "common.family": "Family",
  "common.viewProfile": "View profile",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.demo": "Demo preview",
  "status.alive": "Alive",
  "status.deceased": "Deceased",
};

export const DICTS: Record<Locale, Dict> = { pt, en, nl: en, es: en, fr: en };

export function translator(locale: Locale) {
  const dict = DICTS[locale] ?? pt;
  return (key: string) => dict[key] ?? key;
}
