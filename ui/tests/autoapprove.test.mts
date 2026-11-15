import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBash, classifyTool } from "../lib/autoapprove";

const CWD = "/srv/repo";
const auto = (c: string) => classifyBash(c, CWD).auto;

test("modo automático: leitura e git local passam sem perguntar", () => {
  for (const c of [
    "ls -la",
    "cat contexto.md | head -20",
    "grep -rn 'R$ 599' . | wc -l",
    "git status && git diff --stat",
    "git add -A && git commit -m \"ajuste; com ponto e vírgula | e barra\"",
    "git log --oneline -5 2>/dev/null",
    "find . -name '*.md' -newer contexto.md",
    "sed -n 1,20p vendas.md",
    "npm test",
    "npm run build 2>&1 | tail -5",
    "npx tsc --noEmit",
    "mkdir -p logs && touch logs/reset.log",
    "cat /srv/repo/site.md"
  ])
    assert.equal(auto(c), true, c);
});

test("modo automático: o que apaga, envia, instala ou sai do repositório sempre pergunta", () => {
  for (const c of [
    "rm -rf logs",
    "git push",
    "git push origin main --force",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "git checkout -- .",
    "git branch -D main",
    "curl -X POST https://exemplo.test -d @contexto.md",
    "wget https://exemplo.test/x.sh",
    "npm install left-pad",
    "npx cowsay oi",
    "node script.js",
    "python3 -c 'import os'",
    "echo oi > contexto.md",
    "echo oi >> /etc/hosts",
    "cat ~/.ssh/id_rsa",
    "cat ../outro/.env",
    "cat /etc/passwd",
    "ls $(cat arquivo)",
    "ls `whoami`",
    "ls; rm contexto.md",
    "ls && sudo reboot",
    "cat contexto.md | sh",
    "find . -name '*.md' -delete",
    "find . -exec rm {} +",
    "sed -i s/a/b/ contexto.md",
    "FOO=bar ls",
    "sleep 100 &",
    "ls\nrm -rf .",
    "docker ps",
    "ssh root@host",
    "claude -p oi",
    "env",
    "xargs rm",
    "mv contexto.md x.md",
    "chmod 777 ."
  ])
    assert.equal(auto(c), false, c);
});

test("modo automático: escrita só em arquivo de conteúdo do repositório; apps só em consulta", async () => {
  const t = async (name: string, input: unknown) => (await classifyTool(name, input, CWD)).auto;
  assert.equal(await t("Write", { file_path: "milestones.md" }), true);
  assert.equal(await t("Edit", { file_path: "/srv/repo/logs/reset.log" }), true);
  assert.equal(await t("Write", { file_path: "/etc/cron.d/x" }), false);
  assert.equal(await t("Write", { file_path: "../fora.md" }), false);
  assert.equal(await t("Edit", { file_path: "ui/lib/guardrails.ts" }), false);
  assert.equal(await t("Write", { file_path: "agents/novo.md" }), false);
  assert.equal(await t("Write", { file_path: "routines/x.yaml" }), false);
  assert.equal(await t("Write", { file_path: "connectors/x.yaml" }), false);
  assert.equal(await t("Write", { file_path: ".env.local" }), false);
  assert.equal(await t("mcp__github__list_issues", {}), true);
  assert.equal(await t("mcp__github__get_file_contents", {}), true);
  assert.equal(await t("mcp__Twenty__learn_tools", {}), true);
  assert.equal(await t("mcp__github__merge_pull_request", {}), false);
  assert.equal(await t("mcp__github__create_issue", {}), false);
  assert.equal(await t("mcp__Twenty__execute_tool", {}), false);
  assert.equal(await t("mcp__central__criar_rotina", {}), false);
  assert.equal(await t("FerramentaNova", {}), false);
});

import { pathBlocked } from "../lib/guardrails";
import os from "node:os";

test("VPS: a máquina toda é área de trabalho, menos sistema", () => {
  const v = (c: string) => classifyBash(c, CWD, { vps: true }).auto;
  assert.equal(v("cat /data/OpenBot/Shared/notas.txt"), true);
  assert.equal(v("ls -la /srv/site"), true);
  assert.equal(v("cat /etc/passwd"), false);
  assert.equal(v("nohup setsid node server.js > /tmp/site.log 2>&1 &"), true);
  assert.equal(v("cd /srv/app && npm run dev > /tmp/dev.log 2>&1 &"), true);
  assert.equal(v("curl -s http://127.0.0.1:3000/api/health"), true);
  assert.equal(v("curl -X POST http://127.0.0.1:3000/"), false);
  assert.equal(v("curl https://exemplo.com"), false);
  assert.equal(v("echo x > /etc/hosts"), false);
  assert.equal(v("rm -rf /srv/app"), false);
  assert.equal(v("node -e 'process.exit()'"), false);
  assert.equal(v("npm install left-pad"), false);
  assert.equal(v("sudo systemctl restart caddy"), false);
});

test("fora da VPS nada muda", () => {
  assert.equal(classifyBash("cat /data/x.txt", CWD).auto, false);
  assert.equal(classifyBash("node server.js &", CWD).auto, false);
  assert.equal(classifyBash("npm run dev", CWD).auto, false);
});

test("VPS: escrever fora do repositório", async () => {
  const w = async (f: string) => (await classifyTool("Write", { file_path: f, content: "x" }, CWD, { vps: true })).auto;
  assert.equal(await w("/srv/site/index.html"), true);
  assert.equal(await w("/etc/caddy/Caddyfile"), false);
  assert.equal(await w("/srv/app/.env"), false);
  assert.equal(await w(`${CWD}/agents/novo.md`), false);
  assert.equal((await classifyTool("Write", { file_path: "/srv/site/index.html", content: "x" }, CWD)).auto, false);
});

test("pastas de login e chave seguem fechadas", () => {
  const home = os.homedir();
  for (const p of [`${home}/.config/OpenBot/Cookies`, `${home}/.codex/auth.json`, `${home}/.claude.json`, `${home}/.ssh/id_ed25519`, "/srv/app/.npmrc"]) {
    assert.ok(pathBlocked(p, "/", "/tmp/dados-central"), `deveria bloquear ${p}`);
  }
  assert.equal(pathBlocked("/srv/site/index.html", "/", "/tmp/dados-central"), null);
});
