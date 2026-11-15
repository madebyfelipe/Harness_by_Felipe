import { nowIso } from "./config";
import { getDb, parseJson } from "./db";

export type Conversation = {
  id: string;
  title: string;
  mode: "chat" | "contexto";
  agent: string;
  model: string;
  sdk_session_id: string | null;
  allowed_tools: string[];
  /** Rota escolhida pela triagem na última execução (conversas "auto"). */
  route: Route | null;
  /** Provedor escolhido à mão (menu ⋯). Vazio = contas Claude na ordem da tela Provedores. */
  provider: string | null;
  /** Projeto da conversa (tela Projetos). */
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Route = { agent: string; model: string; contexto?: boolean; workflow?: unknown; pedido?: string; planejado?: boolean };

export type ToolUse = { id: string; name: string; summary: string; agent: string | null };

/** Item da lista de tarefas do agente (painel "Tasks"). */
export type TaskItem = { title: string; status: "pending" | "in_progress" | "done" };

/** O que um subagente fez, na ordem: texto que ele escreveu ou ferramenta que chamou. */
export type SubItem = { k: "text"; text: string } | { k: "tool"; name: string; summary: string };
/** Conversa de um subagente: o pedido de quem delegou, o trabalho e a resposta devolvida. */
export type SubThread = {
  /** id da chamada Agent/Task que abriu o subagente. */
  id: string;
  /** Quem delegou: null = agente principal; senão, o id da conversa do subagente pai. */
  parent: string | null;
  agent: string;
  title: string;
  prompt: string;
  model?: string;
  status: "running" | "done" | "error" | "stopped";
  items: SubItem[];
  result?: string;
  startedAt: number;
  endedAt?: number;
};

export type MessageMeta = {
  model?: string;
  agent?: string;
  tools?: ToolUse[];
  attachments?: { id: string; name: string; size: number; mime?: string }[];
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  turns?: number;
  error?: string;
  stopped?: boolean;
  redo?: boolean;
  auth?: string;
  audio?: boolean;
  triage?: TriageView;
  feedback?: boolean;
  /** Conta/provedor que respondeu (tela Provedores). */
  conta?: string;
  trocas?: string[];
  /** Execução fechada no arranque porque o servidor reiniciou no meio. */
  interrupted?: boolean;
  /** Janela de contexto ao fim da resposta (categorias como no /context). */
  context?: ContextUsage;
  /** Conversa de cada subagente desta resposta (abas no topo do chat). */
  subagents?: SubThread[];
  /** Lista de tarefas como ficou no fim da resposta. */
  tasks?: TaskItem[];
};

export type ContextUsage = { total: number; max: number; pct: number; cats: { id: string; name: string; tokens: number; kind: string }[] };

/** O que a tela mostra da triagem: resumo, nível, passos e o que foi anotado. */
export type TriageView = {
  resumo: string;
  nivel?: string;
  passos?: { n: number; o_que: string; agente: string; modelo: string; checagem?: string }[];
  anotados?: { tipo: string; texto: string; onde: string }[];
  suposicoes?: string[];
  planejar?: boolean;
  falhou?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  run_id: string | null;
  role: "user" | "assistant";
  content: string;
  meta: MessageMeta;
  created_at: string;
};

type ConvRow = Omit<Conversation, "allowed_tools" | "route"> & { allowed_tools: string; route: string | null };
type MsgRow = Omit<Message, "meta"> & { meta: string };

const toConv = (r: ConvRow): Conversation => ({ ...r, allowed_tools: parseJson<string[]>(r.allowed_tools, []), route: r.route ? parseJson<Route | null>(r.route, null) : null });
const toMsg = (r: MsgRow): Message => ({ ...r, meta: parseJson<MessageMeta>(r.meta, {}) });

export async function createConversation(input: { mode: "chat" | "contexto"; agent: string; model: string; title?: string; projectId?: string | null }): Promise<Conversation> {
  const db = await getDb();
  const now = nowIso();
  const id = crypto.randomUUID();
  await db.run(
    "INSERT INTO conversations (id, title, mode, agent, model, sdk_session_id, allowed_tools, archived, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, '[]', 0, ?, ?, ?)",
    [id, input.title || "Nova conversa", input.mode, input.agent, input.model, input.projectId ?? null, now, now]
  );
  return (await getConversation(id))!;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDb();
  const row = await db.get<ConvRow>("SELECT * FROM conversations WHERE id = ? AND archived = 0", [id]);
  return row ? toConv(row) : undefined;
}

export async function listConversations(mode: "chat" | "contexto" | "todas", limit = 50): Promise<Conversation[]> {
  const db = await getDb();
  const rows =
    mode === "todas"
      ? await db.all<ConvRow>("SELECT * FROM conversations WHERE archived = 0 ORDER BY updated_at DESC LIMIT ?", [limit])
      : await db.all<ConvRow>("SELECT * FROM conversations WHERE archived = 0 AND mode = ? ORDER BY updated_at DESC LIMIT ?", [mode, limit]);
  return rows.map(toConv);
}

export type ConversationPreview = Conversation & { preview: string; previewRole: string | null; project_name: string | null };

/** Lista da coluna lateral: conversas com a última mensagem, como no OpenBot. */
export async function listConversationPreviews(limit = 60, q = "", projectId = ""): Promise<ConversationPreview[]> {
  const db = await getDb();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db.all<ConvRow & { preview: string | null; preview_role: string | null; project_name: string | null }>(
    `SELECT c.*, (SELECT p.name FROM projects p WHERE p.id = c.project_id) AS project_name,
       (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS preview,
       (SELECT m.role FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS preview_role
     FROM conversations c
     WHERE c.archived = 0 ${projectId ? "AND c.project_id = ?" : ""} ${q ? "AND (c.title LIKE ? OR EXISTS (SELECT 1 FROM messages m2 WHERE m2.conversation_id = c.id AND m2.content LIKE ?))" : ""}
     ORDER BY c.updated_at DESC LIMIT ?`,
    [...(projectId ? [projectId] : []), ...(q ? [like, like] : []), limit]
  );
  return rows.map((r) => ({ ...toConv(r), preview: (r.preview ?? "").replace(/\s+/g, " ").slice(0, 140), previewRole: r.preview_role, project_name: r.project_name }));
}

export async function updateConversation(id: string, patch: Partial<Pick<Conversation, "title" | "model" | "sdk_session_id" | "allowed_tools" | "route" | "provider" | "project_id">>): Promise<void> {
  const db = await getDb();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [nowIso()];
  if (patch.title !== undefined) (sets.push("title = ?"), params.push(patch.title.slice(0, 120)));
  if (patch.model !== undefined) (sets.push("model = ?"), params.push(patch.model));
  if (patch.project_id !== undefined) (sets.push("project_id = ?"), params.push(patch.project_id || null));
  if (patch.sdk_session_id !== undefined) (sets.push("sdk_session_id = ?"), params.push(patch.sdk_session_id));
  if (patch.allowed_tools !== undefined) (sets.push("allowed_tools = ?"), params.push(JSON.stringify(patch.allowed_tools)));
  if (patch.route !== undefined) (sets.push("route = ?"), params.push(patch.route ? JSON.stringify(patch.route) : null));
  if (patch.provider !== undefined) (sets.push("provider = ?"), params.push(patch.provider || null));
  params.push(id);
  await db.run(`UPDATE conversations SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function archiveConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE conversations SET archived = 1, updated_at = ? WHERE id = ?", [nowIso(), id]);
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const db = await getDb();
  const rows = await db.all<MsgRow>("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, id", [conversationId]);
  return rows.map(toMsg);
}

export async function addMessage(input: { conversationId: string; runId?: string | null; role: "user" | "assistant"; content: string; meta?: MessageMeta }): Promise<Message> {
  const db = await getDb();
  const msg: Message = {
    id: crypto.randomUUID(),
    conversation_id: input.conversationId,
    run_id: input.runId ?? null,
    role: input.role,
    content: input.content,
    meta: input.meta ?? {},
    created_at: nowIso()
  };
  await db.run("INSERT INTO messages (id, conversation_id, run_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    msg.id,
    msg.conversation_id,
    msg.run_id,
    msg.role,
    msg.content,
    JSON.stringify(msg.meta),
    msg.created_at
  ]);
  return msg;
}

export type Attachment = { id: string; conversation_id: string; name: string; path: string; mime: string | null; size: number; created_at: string };

export async function getAttachments(conversationId: string, ids: string[]): Promise<Attachment[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.all<Attachment>(`SELECT * FROM attachments WHERE conversation_id = ? AND id IN (${ids.map(() => "?").join(", ")})`, [conversationId, ...ids]);
  return rows;
}
