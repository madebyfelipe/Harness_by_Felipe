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

test("modo automático: escrita só em arquivo de conteúdo do repositório; apps só em consulta", () => {
  const t = (name: string, input: unknown) => classifyTool(name, input, CWD).auto;
  assert.equal(t("Write", { file_path: "milestones.md" }), true);
  assert.equal(t("Edit", { file_path: "/srv/repo/logs/reset.log" }), true);
  assert.equal(t("Write", { file_path: "/etc/cron.d/x" }), false);
  assert.equal(t("Write", { file_path: "../fora.md" }), false);
  assert.equal(t("Edit", { file_path: "ui/lib/guardrails.ts" }), false);
  assert.equal(t("Write", { file_path: "agents/novo.md" }), false);
  assert.equal(t("Write", { file_path: "routines/x.yaml" }), false);
  assert.equal(t("Write", { file_path: "connectors/x.yaml" }), false);
  assert.equal(t("Write", { file_path: ".env.local" }), false);
  assert.equal(t("mcp__github__list_issues", {}), true);
  assert.equal(t("mcp__github__get_file_contents", {}), true);
  assert.equal(t("mcp__Twenty__learn_tools", {}), true);
  assert.equal(t("mcp__github__merge_pull_request", {}), false);
  assert.equal(t("mcp__github__create_issue", {}), false);
  assert.equal(t("mcp__Twenty__execute_tool", {}), false);
  assert.equal(t("mcp__central__criar_rotina", {}), false);
  assert.equal(t("FerramentaNova", {}), false);
});
