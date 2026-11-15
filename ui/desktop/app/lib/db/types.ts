export type Row = Record<string, unknown>;

/**
 * Camada única de acesso ao banco. O SQL é escrito uma vez, com `?` como
 * marcador, e roda igual no SQLite (modo local) e no Postgres (modo VPS).
 * Regras para manter os dois compatíveis: ids e datas em TEXT (ISO 8601),
 * booleanos em INTEGER 0/1, JSON em TEXT, nada de função específica de um banco.
 */
export interface Db {
  dialect: "sqlite" | "postgres";
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/** Converte `?` em `$1, $2…` para o Postgres, sem tocar em texto entre aspas. */
export function toPgPlaceholders(sql: string): string {
  let out = "";
  let n = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
    } else if (ch === "?") {
      n += 1;
      out += `$${n}`;
    } else {
      out += ch;
    }
  }
  return out;
}
