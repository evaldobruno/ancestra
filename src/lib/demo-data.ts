// In-memory demo dataset that mirrors the seed SQL. Lets the UI render a rich
// preview before you connect Supabase. Once env vars are set, swap these for
// real queries (see lib/queries.ts for the wiring points).

export type Member = {
  id: string;
  name: string;
  knownAs: string;
  birthDate: string;
  birthPlace?: string;
  profession?: string;
  status: "alive" | "deceased";
  generation: number;
  branch: string;
  color: string;
  avatarUrl?: string;
  gender?: string;
  deathDate?: string;
  parents: string[];
  spouse?: string;
  spouseDivorced?: boolean;
};

export const MEMBERS: Member[] = [
  { id: "g-joao", name: "João Gonçalves", knownAs: "Avô João", birthDate: "1955-01-20", birthPlace: "Évora", profession: "Reformado", status: "alive", generation: 0, branch: "paternal", color: "#c14624", parents: [], spouse: "g-maria" },
  { id: "g-maria", name: "Maria Gonçalves", knownAs: "Avó Maria", birthDate: "1958-11-11", birthPlace: "Évora", profession: "Reformada", status: "alive", generation: 0, branch: "maternal", color: "#406341", parents: [], spouse: "g-joao" },
  { id: "g-bruno", name: "Bruno Gonçalves", knownAs: "Bruno", birthDate: "1985-04-12", birthPlace: "Lisboa", profession: "Engenheiro", status: "alive", generation: 1, branch: "paternal", color: "#d95a30", parents: ["g-joao", "g-maria"], spouse: "g-ana" },
  { id: "g-ana", name: "Ana Gonçalves", knownAs: "Ana", birthDate: "1987-09-03", birthPlace: "Porto", profession: "Professora", status: "alive", generation: 1, branch: "maternal", color: "#547d54", parents: [], spouse: "g-bruno" },
  { id: "g-carol", name: "Carolina Gonçalves", knownAs: "Carol", birthDate: "2015-06-29", birthPlace: "Setúbal", profession: "Estudante", status: "alive", generation: 2, branch: "paternal", color: "#e67a52", parents: ["g-bruno", "g-ana"] },
];

export type EventItem = { id: string; title: string; date: string; category: string; location?: string };
export const EVENTS: EventItem[] = [
  { id: "e1", title: "Aniversário da Carolina", date: addDays(2), category: "birthday", location: "Setúbal" },
  { id: "e2", title: "Reunião de Verão", date: addDays(30), category: "reunion", location: "Évora" },
];

export type Birthday = { id: string; name: string; date: string; memberId: string };
export const BIRTHDAYS: Birthday[] = [
  { id: "b1", name: "Carolina", date: nextBirthday("06-29"), memberId: "g-carol" },
  { id: "b2", name: "Ana", date: nextBirthday("09-03"), memberId: "g-ana" },
  { id: "b3", name: "Bruno", date: nextBirthday("04-12"), memberId: "g-bruno" },
];

export type Memory = { id: string; title: string; category: string; date: string; excerpt: string };
export const MEMORIES: Memory[] = [
  { id: "m1", title: "O nosso primeiro Natal em Setúbal", category: "traditions", date: "2014-12-25", excerpt: "Foi o primeiro Natal na casa nova…" },
  { id: "m2", title: "Receita do bolo da Avó Maria", category: "recipes", date: "2010-03-01", excerpt: "O segredo está na canela." },
  { id: "m3", title: "Viagem a Paris", category: "travel", date: "2019-08-10", excerpt: "A família visitou Paris." },
];

export const ON_THIS_DAY = [
  { id: "o1", text: "Hoje a Carolina faz anos! 🎂", year: 2015 },
  { id: "o2", text: "Há 13 anos, o Bruno e a Ana casaram-se em Lisboa.", year: 2013 },
];

export const TASKS = [
  { id: "t1", title: "Encomendar o bolo", due: addDays(1), priority: "high" },
  { id: "t2", title: "Confirmar convidados da reunião", due: addDays(10), priority: "medium" },
];

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function nextBirthday(mmdd: string) {
  const [m, d] = mmdd.split("-").map(Number);
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, m - 1, d);
  if (candidate < now) year += 1;
  return new Date(year, m - 1, d).toISOString().slice(0, 10);
}
