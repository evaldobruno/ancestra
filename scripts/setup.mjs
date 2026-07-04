#!/usr/bin/env node
/**
 * Ancestra — script de arranque local.
 * Verifica o Node, cria o .env.local a partir do exemplo (se não existir),
 * e diz-te o que falta preencher. Corre com:  node scripts/setup.mjs
 */
import { readFileSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);
const info = (m) => console.log(`  ${m}`);

console.log("\n🏡  Ancestra — verificação de arranque\n");

// 1. Node version
const major = Number(process.versions.node.split(".")[0]);
if (major >= 18) ok(`Node ${process.versions.node}`);
else { warn(`Node ${process.versions.node} — precisas de 18 ou superior (https://nodejs.org)`); process.exit(1); }

// 2. .env.local
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");
if (!existsSync(envPath)) {
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    ok("Criei o .env.local a partir do .env.example");
  } else {
    warn("Não encontrei o .env.example");
  }
} else {
  ok(".env.local já existe");
}

// 3. Quais variáveis ainda faltam preencher
if (existsSync(envPath)) {
  const env = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((k) => !env[k] || env[k].includes("YOUR-") || env[k].includes("your-"));
  if (missing.length === 0) {
    ok("Variáveis do Supabase preenchidas — modo dados reais 🟢");
  } else {
    warn("Falta preencher no .env.local (até lá, corre em modo demo 🟡):");
    missing.forEach((k) => info(`- ${k}`));
    info("→ Settings → API no painel do Supabase");
  }
}

// 4. node_modules instalado?
if (existsSync(join(root, "node_modules"))) ok("Dependências instaladas");
else { warn("Falta instalar dependências — corre:  npm install"); }

console.log("\nProximos passos:");
info("1) npm install        (se ainda não o fizeste)");
info("2) npm run dev        → http://localhost:3000");
info("3) Vê o IMPLEMENTACAO.md para ligar o Supabase e fazer deploy\n");
