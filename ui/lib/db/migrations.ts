import type { Db } from "./types";

type Migration = { id: string; statements: string[] };

/** Só acrescente migrações no fim; nunca edite uma que já foi aplicada. */
export const MIGRATIONS: Migration[] = [
  {
    id: "001_base",
    statements: [
      `CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        totp_secret_enc TEXT NOT NULL,
        totp_last_counter INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE recovery_codes (
        code_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        used_at TEXT
      )`,
      `CREATE TABLE passkeys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        transports TEXT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      )`,
      `CREATE TABLE sessions (
        id_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        method TEXT NOT NULL,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,
      `CREATE TABLE kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TEXT
      )`,
      `CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        agent TEXT NOT NULL,
        model TEXT NOT NULL,
        sdk_session_id TEXT,
        allowed_tools TEXT NOT NULL DEFAULT '[]',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        run_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX messages_conv ON messages (conversation_id, created_at)`,
      `CREATE TABLE runs (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        agent TEXT NOT NULL,
        model TEXT NOT NULL,
        origin TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        result TEXT,
        tools TEXT NOT NULL DEFAULT '[]',
        cost_usd DOUBLE PRECISION,
        input_tokens INTEGER,
        output_tokens INTEGER,
        num_turns INTEGER,
        duration_ms INTEGER,
        error TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT
      )`,
      `CREATE INDEX runs_started ON runs (started_at)`,
      `CREATE TABLE approvals (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        run_id TEXT,
        agent TEXT,
        tool TEXT NOT NULL,
        input TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        decided_at TEXT
      )`,
      `CREATE TABLE attachments (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        mime TEXT,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE workers (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        host TEXT NOT NULL,
        pid INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        info TEXT
      )`,
      `CREATE TABLE connector_status (
        name TEXT PRIMARY KEY,
        ok INTEGER NOT NULL,
        detail TEXT NOT NULL,
        latency_ms INTEGER,
        checked_at TEXT NOT NULL
      )`,
      `CREATE TABLE audit (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT
      )`
    ]
  },
  {
    // Triagem sempre ligada: rota da última execução por conversa e registro de cada triagem.
    id: "002_triagem",
    statements: [
      "ALTER TABLE conversations ADD COLUMN route TEXT",
      `CREATE TABLE triages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        run_id TEXT,
        pedido TEXT NOT NULL,
        nivel TEXT,
        soma INTEGER,
        agente TEXT,
        modelo TEXT,
        resumo TEXT,
        itens TEXT,
        workflow TEXT,
        status TEXT,
        subiu_modelo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`
    ]
  },
  {
    // Provedores de IA (várias contas Claude, ChatGPT pelo Codex) e o provedor escolhido por conversa.
    id: "003_provedores",
    statements: [
      `CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        home TEXT,
        secret_enc TEXT,
        info TEXT,
        created_at TEXT NOT NULL
      )`,
      "ALTER TABLE conversations ADD COLUMN provider TEXT"
    ]
  },
  {
    // Cofre da Central (segredos cifrados com a chave mestra) e histórico das rotinas.
    id: "004_cofre_rotinas",
    statements: [
      `CREATE TABLE secrets (
        name TEXT PRIMARY KEY,
        value_enc TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT
      )`,
      `CREATE TABLE routine_runs (
        id TEXT PRIMARY KEY,
        rotina TEXT NOT NULL,
        origem TEXT NOT NULL,
        conversation_id TEXT,
        run_id TEXT,
        status TEXT NOT NULL,
        resumo TEXT,
        erro TEXT,
        avisado INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        ended_at TEXT
      )`
    ]
  },
  {
    // Fase 4: escopo do segredo por agente e registro de uso.
    id: "005_cofre_escopo",
    statements: [
      "ALTER TABLE secrets ADD COLUMN agents TEXT",
      `CREATE TABLE secret_uses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent TEXT NOT NULL,
        onde TEXT NOT NULL,
        used_at TEXT NOT NULL
      )`
    ]
  },
  {
    // Projetos: agrupam conversas e levam instruções próprias; chamados no chat com @.
    id: "006_projetos",
    statements: [
      `CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        instructions TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      "ALTER TABLE conversations ADD COLUMN project_id TEXT"
    ]
  }
];

export async function migrate(db: Db): Promise<string[]> {
  await db.exec("CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const done = new Set((await db.all<{ id: string }>("SELECT id FROM migrations")).map((r) => r.id));
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.exec("BEGIN");
    try {
      for (const s of m.statements) await db.exec(s);
      await db.run("INSERT INTO migrations (id, applied_at) VALUES (?, ?)", [m.id, new Date().toISOString()]);
      await db.exec("COMMIT");
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }
    applied.push(m.id);
  }
  return applied;
}
