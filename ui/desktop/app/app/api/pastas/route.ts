import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fail, guard, json, readJson, str } from "@/lib/http";
import { cfg } from "@/lib/config";
import { ensureFolder, ensureProjectsRoot, expandPath, folderRefused, listSubfolders, validateProjectFolder } from "@/lib/paths";

/*
 * Seletor de pastas da Central (funciona no navegador da VPS e no app desktop).
 * - GET  /api/pastas?caminho=...  lista as subpastas de uma pasta do computador.
 * - POST /api/pastas { caminho, nome }  cria uma pasta dentro de outra.
 * Segredos (dados da Central, .ssh, .claude…) nunca aparecem.
 */

function resolve(raw: string): { abs?: string; error?: string } {
  const t = String(raw ?? "").trim();
  if (!t || (!t.startsWith("/") && !t.startsWith("~") && !/^[A-Za-z]:[\\/]/.test(t))) {
    return { error: "Informe um caminho absoluto (ou ~)." };
  }
  const abs = expandPath(t);
  const why = folderRefused(abs, cfg().dataDir);
  if (why) return { error: `Não posso abrir essa pasta: ${why}.` };
  return { abs };
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const url = new URL(req.url);
  const pedido = url.searchParams.get("caminho")?.trim();
  const alvo = pedido || ensureProjectsRoot();
  const r = resolve(alvo);
  if (!r.abs) return fail(r.error ?? "Caminho inválido.", 400);
  try {
    if (!fs.statSync(r.abs).isDirectory()) return fail("Esse caminho não é uma pasta.");
  } catch {
    return fail(`A pasta ${r.abs} não existe.`, 404);
  }
  let subpastas: { nome: string; caminho: string }[] = [];
  let erro: string | undefined;
  try {
    subpastas = listSubfolders(r.abs);
  } catch (e) {
    erro = e instanceof Error ? (e as NodeJS.ErrnoException).code === "EACCES" ? "Sem permissão para listar esta pasta." : e.message : "Não consegui listar.";
  }
  const pai = path.dirname(r.abs);
  return json({
    caminho: r.abs,
    pai: pai === r.abs ? null : pai,
    raiz: ensureProjectsRoot(),
    casa: os.homedir(),
    subpastas,
    ...(erro ? { erro } : {})
  });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await readJson(req);
  const pai = resolve(str(body.caminho, 400));
  if (!pai.abs) return fail(pai.error ?? "Caminho inválido.", 400);
  const nome = str(body.nome, 80).trim();
  if (!nome || /[\\/]/.test(nome) || nome === "." || nome === ".." || nome.startsWith(".")) return fail("Dê um nome de pasta simples, sem barras e sem começar com ponto.");
  const alvo = validateProjectFolder(path.join(pai.abs, nome), cfg().dataDir);
  try {
    ensureFolder(alvo);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não criei a pasta.");
  }
  return json({ caminho: alvo });
}
