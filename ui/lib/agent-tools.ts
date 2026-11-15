import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { getConnector, listConnectors, normalizeConnector, resolveSecret, saveConnector, secretState } from "./connectors";
import { getRoutine, listRoutines, normalizeRoutine, saveRoutine } from "./routines";
import { loadVault } from "./vault";

/*
 * Ferramentas próprias da Central, entregues a todo agente como o servidor MCP "central".
 * Dão autonomia sem tirar o Felipe do circuito:
 *  - perguntar_ao_felipe / pedir_acesso abrem um cartão no chat e esperam a resposta dele;
 *  - criar_rotina / conectar_app gravam no repositório, depois do cartão de aprovação
 *    (o portão do runner pede a aprovação antes de a ferramenta rodar).
 * O valor de um segredo nunca passa pelo modelo: vai do cartão direto para o cofre.
 */

export const CENTRAL_SERVER = "central";
const T = (n: string) => `mcp__${CENTRAL_SERVER}__${n}`;
/** Não pedem aprovação: só leem, ou já são um pedido ao Felipe. */
export const CENTRAL_AUTO = [T("perguntar_ao_felipe"), T("pedir_acesso"), T("listar_rotinas"), T("listar_apps")];

export type AskReply = { ok: boolean; answer?: string };
export type AskData =
  | { kind: "pergunta"; pergunta: string; opcoes: string[]; agent: string }
  | { kind: "acesso"; segredo: string; motivo: string; onde: string; agent: string };

export type ToolsCtx = {
  /** Abre o cartão no chat e espera. Em rotina (ninguém acompanhando) devolve null. */
  ask: (data: AskData) => Promise<AskReply | null>;
  agent: () => string;
};

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], ...(isError ? { isError: true } : {}) });
const SECRET_RE = /^[A-Z][A-Z0-9_]{2,63}$/;
const SEM_PLATEIA = 'Ninguém está acompanhando esta execução (rotina). Não insista: siga sem isso e liste no fim como "Precisa do Felipe".';

export function centralTools(ctx: ToolsCtx) {
  return createSdkMcpServer({
    name: CENTRAL_SERVER,
    version: "1.0.0",
    instructions:
      "Ferramentas da Central. Use perguntar_ao_felipe quando só ele sabe a resposta (com opções reais); pedir_acesso quando faltar chave, token ou senha (nunca peça para colar no texto do chat); criar_rotina para algo recorrente; conectar_app para ligar um servidor MCP novo.",
    tools: [
      tool(
        "perguntar_ao_felipe",
        "Faz UMA pergunta ao Felipe por um cartão no chat e espera a resposta. Use quando a decisão é dele ou só ele sabe. Dê de 2 a 4 opções reais e curtas (ele também pode escrever outra resposta).",
        { pergunta: z.string().min(5).max(400), opcoes: z.array(z.string().min(1).max(80)).max(4).optional() },
        async (a) => {
          const r = await ctx.ask({ kind: "pergunta", pergunta: a.pergunta, opcoes: a.opcoes ?? [], agent: ctx.agent() });
          if (!r) return text(SEM_PLATEIA);
          return r.ok && r.answer ? text(`Resposta do Felipe: ${r.answer}`) : text("O Felipe não respondeu (dispensou a pergunta). Siga com a opção mais segura e diga o que assumiu.");
        },
        { alwaysLoad: true }
      ),
      tool(
        "pedir_acesso",
        "Pede ao Felipe uma chave de API, token ou senha por um cartão seguro no chat. O valor vai direto para o cofre da Central com o NOME informado; você nunca vê o valor. Use o nome que o conector espera (ex.: TWENTY_API_KEY).",
        {
          segredo: z.string().regex(SECRET_RE, "MAIÚSCULAS, números e _ (ex.: APIFY_TOKEN)"),
          motivo: z.string().min(5).max(300),
          onde_obter: z.string().max(300).optional()
        },
        async (a) => {
          await loadVault().catch(() => undefined);
          if (resolveSecret(a.segredo)) return text(`O segredo ${a.segredo} já está definido. Não precisa pedir de novo.`);
          const r = await ctx.ask({ kind: "acesso", segredo: a.segredo, motivo: a.motivo, onde: a.onde_obter ?? "", agent: ctx.agent() });
          if (!r) return text(SEM_PLATEIA);
          return r.ok
            ? text(`Guardado no cofre como ${a.segredo}. Conectores que usam esse segredo passam a funcionar a partir da próxima mensagem desta conversa.`)
            : text(`O Felipe não informou ${a.segredo} agora. Não tente outro caminho para obter esse acesso; diga o que ficou pendente.`);
        },
        { alwaysLoad: true }
      ),
      tool("listar_rotinas", "Lista as rotinas da Central (routines/*.yaml): nome, quando roda, agente e se está ligada.", {}, async () => {
        const { routines } = listRoutines();
        return text(routines.length ? routines.map((r) => `${r.nome} · ${r.quando} · agente ${r.agente} · ${r.ativa ? "ligada" : "desligada"} · ${r.titulo}`).join("\n") : "Nenhuma rotina.");
      }, { alwaysLoad: true }),
      tool("listar_apps", "Lista os apps/conectores da Central (connectors/*.yaml) e se o segredo de cada um está definido.", {}, async () => {
        await loadVault().catch(() => undefined);
        const { connectors } = listConnectors();
        return text(
          connectors.length
            ? connectors.map((c) => `${c.nome} · ${c.titulo} · ${c.tipo}${c.mcp ? ` · ${c.mcp.url}` : ""} · segredo: ${c.segredo ? `${c.segredo} (${secretState(c) === "definido" ? "definido" : "AUSENTE"})` : "não usa"} · agentes: ${c.agentes.join(", ")}`).join("\n")
            : "Nenhum app conectado."
        );
      }),
      tool(
        "criar_rotina",
        'Cria (ou substitui) uma rotina agendada da Central. O Felipe aprova no chat antes de gravar. "quando" em português: "todo dia às 08:00", "dias úteis às 07:30", "segunda às 09:00", "a cada 2 horas". As instruções precisam ser autocontidas: a rotina roda sozinha, sem esta conversa. Dentro da rotina, terminal e escrita de arquivo continuam pedindo aprovação.',
        {
          nome: z.string().regex(/^[a-z0-9][a-z0-9-]{1,49}$/, "minúsculas, números e hífen"),
          titulo: z.string().min(3).max(80),
          quando: z.string().min(3).max(80),
          instrucoes: z.string().min(20).max(12000),
          agente: z.string().max(50).optional(),
          silencio: z.boolean().optional(),
          whatsapp: z.boolean().optional(),
          limite_minutos: z.number().int().min(2).max(240).optional(),
          substituir: z.boolean().optional()
        },
        async (a) => {
          try {
            if (getRoutine(a.nome) && !a.substituir) return text(`Já existe a rotina "${a.nome}". Use substituir: true para trocar, ou outro nome.`, true);
            // Um agente não libera ferramentas para a própria rotina: isso só o Felipe faz, na tela.
            const r = normalizeRoutine({ ...a, agente: a.agente || "auto", modo: "vps", ativa: true, silencio: a.silencio ?? true, whatsapp: a.whatsapp ?? false, liberadas: [] });
            const c = await saveRoutine(r, `agente ${ctx.agent()}`);
            return text(`Rotina "${r.titulo}" criada e ligada: ${r.quando}. Arquivo ${r.file}${c.commit ? ` (commit ${c.commit})` : ""}. O Felipe ajusta ou desliga em Configurações → Rotinas.`);
          } catch (e) {
            return text(`Não criei a rotina: ${e instanceof Error ? e.message : "erro"}`, true);
          }
        },
        { alwaysLoad: true }
      ),
      tool(
        "conectar_app",
        "Liga um servidor MCP novo à Central (cria connectors/<nome>.yaml). O Felipe aprova no chat antes de gravar. Informe só o NOME do segredo, nunca o valor; se o segredo ainda não existir, chame pedir_acesso em seguida. Só URL https.",
        {
          nome: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "minúsculas, números e hífen"),
          titulo: z.string().min(2).max(60),
          url: z.string().url().max(300),
          uso: z.string().min(5).max(300),
          segredo: z.string().regex(SECRET_RE).optional(),
          transporte: z.enum(["http", "sse"]).optional(),
          agentes: z.array(z.string().max(50)).max(20).optional()
        },
        async (a) => {
          try {
            if (getConnector(a.nome)) return text(`Já existe o app "${a.nome}". Para mudar, o Felipe edita em Configurações → Apps.`, true);
            const c = normalizeConnector({
              nome: a.nome,
              titulo: a.titulo,
              tipo: "mcp",
              uso: a.uso,
              ...(a.segredo ? { segredo: a.segredo } : {}),
              agentes: a.agentes?.length ? a.agentes : ["*"],
              mcp: { nome: a.nome, url: a.url, transporte: a.transporte ?? "http" }
            });
            const res = await saveConnector(c, `agente ${ctx.agent()}`, true);
            await loadVault().catch(() => undefined);
            const falta = c.segredo && !resolveSecret(c.segredo);
            return text(
              `App "${c.titulo}" conectado (connectors/${c.nome}.yaml${res.commit ? `, commit ${res.commit}` : ""}). As ferramentas dele ficam disponíveis a partir da próxima mensagem desta conversa.${
                falta ? ` Falta o segredo ${c.segredo}: chame pedir_acesso agora.` : ""
              } Se o servidor exigir login pelo navegador (OAuth), avise o Felipe: isso se faz em Configurações → Apps.`
            );
          } catch (e) {
            return text(`Não conectei o app: ${e instanceof Error ? e.message : "erro"}`, true);
          }
        },
        { alwaysLoad: true }
      )
    ]
  });
}
