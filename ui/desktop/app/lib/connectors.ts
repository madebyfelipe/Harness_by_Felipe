import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { cfg, nowIso } from "./config";
import { getDb } from "./db";
import { commitPaths, type CommitResult } from "./git";
import { listYamlFiles, repoDir } from "./repo";
import { secretAllowed, vaultValue } from "./vault";

/*
 * Um conector = um arquivo connectors/<nome>.yaml. O arquivo guarda só o NOME do
 * segredo; o valor vem de fora do repositório (Fase 1: variável de ambiente em
 * ~/.central/env; Fase 4: cofre). `resolveSecret` é o único ponto que busca o valor.
 */

export type Connector = {
  nome: string;
  titulo: string;
  tipo: "rest" | "mcp" | "rest+mcp" | "nativo";
  prioridade: number;
  uso: string;
  endpoint: string;
  segredo: string;
  agentes: string[];
  mcp?: { nome: string; url: string; transporte: "http" | "sse" };
  saude?: { metodo: "GET" | "POST"; url: string; auth: "bearer" | "nenhuma"; espera: number[] };
  file: string;
};

export type Step = { nome: string; ok: boolean; detalhe: string };
export type TestResult = { ok: boolean; detail: string; latencyMs: number; steps: Step[]; checkedAt: string };

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const SECRET_RE = /^[A-Z][A-Z0-9_]{2,63}$/;
const MCP_NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{1,39}$/;

function asUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "https:" || (u.protocol === "http:" && local)) return u;
  } catch {
    /* inválida */
  }
  return null;
}

/** Valida e normaliza o que veio do YAML (ou do formulário). Lança com o motivo. */
export function normalizeConnector(raw: unknown, file = ""): Connector {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const nome = String(r.nome ?? "").trim();
  if (!NAME_RE.test(nome)) throw new Error("nome: use letras minúsculas, números e hífen (2 a 40 caracteres)");
  const tipo = String(r.tipo ?? "rest") as Connector["tipo"];
  if (!["rest", "mcp", "rest+mcp", "nativo"].includes(tipo)) throw new Error("tipo inválido");
  const segredo = String(r.segredo ?? "").trim();
  if (segredo && !SECRET_RE.test(segredo)) throw new Error("segredo: informe só o NOME, em maiúsculas (ex.: TWENTY_API_KEY)");

  const c: Connector = {
    nome,
    titulo: String(r.titulo ?? nome).trim().slice(0, 80) || nome,
    tipo,
    prioridade: [1, 2, 3].includes(Number(r.prioridade)) ? Number(r.prioridade) : 3,
    uso: String(r.uso ?? "").trim().slice(0, 300),
    endpoint: "",
    segredo,
    agentes: Array.isArray(r.agentes) ? r.agentes.map((a) => String(a).trim()).filter(Boolean) : ["*"],
    file: file || `connectors/${nome}.yaml`
  };
  if (r.endpoint) {
    const u = asUrl(r.endpoint);
    if (!u) throw new Error("endpoint: use uma URL https");
    c.endpoint = u.toString().replace(/\/$/, "");
  }
  if (r.mcp && typeof r.mcp === "object") {
    const m = r.mcp as Record<string, unknown>;
    const u = asUrl(m.url);
    if (!u) throw new Error("mcp.url: use uma URL https");
    const mcpNome = String(m.nome ?? nome).trim();
    if (!MCP_NAME_RE.test(mcpNome)) throw new Error("mcp.nome: letras, números, _ ou - (vira mcp__<nome>__ferramenta)");
    c.mcp = { nome: mcpNome, url: u.toString(), transporte: m.transporte === "sse" ? "sse" : "http" };
  }
  if (tipo.includes("mcp") && !c.mcp) throw new Error("conector MCP precisa de mcp.url");
  if (r.saude && typeof r.saude === "object") {
    const s = r.saude as Record<string, unknown>;
    const u = asUrl(s.url);
    if (!u) throw new Error("saude.url: use uma URL https");
    const espera = (Array.isArray(s.espera) ? s.espera : [s.espera ?? 200]).map(Number).filter((n) => n >= 100 && n < 600);
    c.saude = {
      metodo: s.metodo === "POST" ? "POST" : "GET",
      url: u.toString(),
      auth: s.auth === "nenhuma" ? "nenhuma" : "bearer",
      espera: espera.length ? espera : [200]
    };
  }
  return c;
}

export function listConnectors(): { connectors: Connector[]; errors: { file: string; error: string }[] } {
  const connectors: Connector[] = [];
  const errors: { file: string; error: string }[] = [];
  for (const file of listYamlFiles("connectors")) {
    try {
      const raw = YAML.parse(fs.readFileSync(path.join(repoDir(), file), "utf8"));
      connectors.push(normalizeConnector(raw, file));
    } catch (e) {
      errors.push({ file, error: e instanceof Error ? e.message : "YAML inválido" });
    }
  }
  connectors.sort((a, b) => a.prioridade - b.prioridade || a.titulo.localeCompare(b.titulo));
  return { connectors, errors };
}

export function getConnector(nome: string): Connector | undefined {
  return listConnectors().connectors.find((c) => c.nome === nome);
}

export function toYaml(c: Connector): string {
  const doc: Record<string, unknown> = { nome: c.nome, titulo: c.titulo, tipo: c.tipo, prioridade: c.prioridade };
  if (c.uso) doc.uso = c.uso;
  if (c.endpoint) doc.endpoint = c.endpoint;
  if (c.segredo) doc.segredo = c.segredo;
  doc.agentes = c.agentes;
  if (c.mcp) doc.mcp = c.mcp;
  if (c.saude) doc.saude = c.saude;
  return (
    "# Conector da Central. O campo `segredo` é só o NOME; o valor fica fora do repositório.\n" +
    YAML.stringify(doc, { lineWidth: 0 })
  );
}

export async function saveConnector(c: Connector, who: string, isNew: boolean): Promise<CommitResult> {
  const rel = `connectors/${c.nome}.yaml`;
  const abs = path.join(repoDir(), rel);
  if (isNew && fs.existsSync(abs)) throw new Error("Já existe um conector com esse nome.");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, toYaml(c));
  return commitPaths([rel], `central: conector ${c.nome} ${isNew ? "criado" : "atualizado"} (${who})`);
}

export async function deleteConnector(nome: string, who: string): Promise<CommitResult> {
  const c = getConnector(nome);
  if (!c) throw new Error("Conector não encontrado.");
  fs.unlinkSync(path.join(repoDir(), c.file));
  const db = await getDb();
  await db.run("DELETE FROM connector_status WHERE name = ?", [nome]);
  return commitPaths([c.file], `central: conector ${nome} removido (${who})`);
}

/* ---------- segredos ---------- */

/** Cofre da Central primeiro (Apps → Conectar); depois a variável de ambiente (~/.central/env). */
export function resolveSecret(name: string): string | undefined {
  if (!name || !SECRET_RE.test(name)) return undefined;
  const fromVault = vaultValue(name);
  if (fromVault) return fromVault;
  cfg(); // garante que ~/.central/env foi lido
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function secretState(c: Connector): "nao_usa" | "definido" | "ausente" {
  if (!c.segredo) return "nao_usa";
  return resolveSecret(c.segredo) ? "definido" : "ausente";
}

export function allowedFor(c: Connector, agent: string): boolean {
  return c.agentes.includes("*") || c.agentes.includes(agent);
}

/** Servidores MCP que um agente pode usar, já com o segredo no cabeçalho. */
export function mcpServersFor(agent: string): Record<string, { type: "http" | "sse"; url: string; headers?: Record<string, string> }> {
  const out: Record<string, { type: "http" | "sse"; url: string; headers?: Record<string, string> }> = {};
  for (const c of listConnectors().connectors) {
    if (!c.mcp || !allowedFor(c, agent)) continue;
    if (c.segredo && !secretAllowed(c.segredo, agent)) continue; // o Cofre restringe este segredo a outros agentes
    const secret = resolveSecret(c.segredo);
    if (c.segredo && !secret) continue; // sem segredo o servidor só devolveria 401
    out[c.mcp.nome] = { type: c.mcp.transporte, url: c.mcp.url, ...(secret ? { headers: { Authorization: `Bearer ${secret}` } } : {}) };
  }
  return out;
}

/* ---------- teste de saúde ---------- */

/** Nunca devolve o valor do segredo em mensagem de erro. */
function scrub(text: string, secret?: string): string {
  const t = secret ? text.split(secret).join("•••") : text;
  return t.replace(/\s+/g, " ").slice(0, 240);
}

async function httpStep(c: Connector, secret: string | undefined): Promise<Step> {
  const s = c.saude!;
  try {
    const res = await fetch(s.url, {
      method: s.metodo,
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json", "User-Agent": "central-conector", ...(s.auth === "bearer" && secret ? { Authorization: `Bearer ${secret}` } : {}) }
    });
    const ok = s.espera.includes(res.status);
    return { nome: "saúde", ok, detalhe: ok ? `HTTP ${res.status}` : `HTTP ${res.status} (esperado ${s.espera.join(" ou ")})` };
  } catch (e) {
    return { nome: "saúde", ok: false, detalhe: scrub(e instanceof Error ? e.message : "sem resposta", secret) };
  }
}

async function mcpStep(c: Connector, secret: string | undefined): Promise<Step> {
  const m = c.mcp!;
  const headers: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};
  try {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const client = new Client({ name: "central", version: "0.1.0" });
    const url = new URL(m.url);
    const transport =
      m.transporte === "sse"
        ? new (await import("@modelcontextprotocol/sdk/client/sse.js")).SSEClientTransport(url, { requestInit: { headers } })
        : new (await import("@modelcontextprotocol/sdk/client/streamableHttp.js")).StreamableHTTPClientTransport(url, { requestInit: { headers } });
    const timeout = { timeout: 15_000 };
    try {
      await client.connect(transport, timeout);
      const tools = await client.listTools(undefined, timeout);
      return { nome: "MCP", ok: true, detalhe: `${tools.tools.length} ferramentas` };
    } finally {
      await client.close().catch(() => undefined);
    }
  } catch (e) {
    return { nome: "MCP", ok: false, detalhe: scrub(e instanceof Error ? e.message : "falha ao conectar", secret) };
  }
}

export async function testConnector(c: Connector): Promise<TestResult> {
  const started = Date.now();
  const steps: Step[] = [];
  const secret = resolveSecret(c.segredo);
  if (c.segredo) {
    steps.push({ nome: "segredo", ok: Boolean(secret), detalhe: secret ? `${c.segredo} definido` : `${c.segredo} ausente` });
  }
  if (!c.segredo || secret) {
    if (c.saude) steps.push(await httpStep(c, secret));
    if (c.mcp) steps.push(await mcpStep(c, secret));
  }
  if (!c.saude && !c.mcp) steps.push({ nome: "saúde", ok: false, detalhe: "sem teste definido no arquivo" });
  const ok = steps.every((s) => s.ok);
  const result: TestResult = {
    ok,
    detail: steps.map((s) => `${s.nome}: ${s.detalhe}`).join(" · "),
    latencyMs: Date.now() - started,
    steps,
    checkedAt: nowIso()
  };
  const db = await getDb();
  await db.run(
    "INSERT INTO connector_status (name, ok, detail, latency_ms, checked_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (name) DO UPDATE SET ok = excluded.ok, detail = excluded.detail, latency_ms = excluded.latency_ms, checked_at = excluded.checked_at",
    [c.nome, ok ? 1 : 0, result.detail, result.latencyMs, result.checkedAt]
  );
  return result;
}

export type StatusRow = { name: string; ok: number; detail: string; latency_ms: number | null; checked_at: string };

export async function lastStatuses(): Promise<Record<string, StatusRow>> {
  const db = await getDb();
  const rows = await db.all<StatusRow>("SELECT * FROM connector_status");
  return Object.fromEntries(rows.map((r) => [r.name, r]));
}
