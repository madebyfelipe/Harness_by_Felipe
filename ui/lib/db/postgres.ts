import type { Db, Row } from "./types";
import { toPgPlaceholders } from "./types";

/** O mínimo que o adaptador precisa de um cliente Postgres (pg.Pool atende). */
export type PgQueryable = {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount?: number | null; affectedRows?: number }>;
  end?(): Promise<void>;
  close?(): Promise<void>;
};

function bind(params: unknown[] = []): unknown[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p !== null && typeof p === "object" && !(p instanceof Uint8Array) && !(p instanceof Date)) return JSON.stringify(p);
    return p;
  });
}

export function wrapPostgres(client: PgQueryable): Db {
  return {
    dialect: "postgres",
    async all<T = Row>(sql: string, params?: unknown[]) {
      const r = await client.query(toPgPlaceholders(sql), bind(params));
      return r.rows as T[];
    },
    async get<T = Row>(sql: string, params?: unknown[]) {
      const r = await client.query(toPgPlaceholders(sql), bind(params));
      return r.rows[0] as T | undefined;
    },
    async run(sql: string, params?: unknown[]) {
      const r = await client.query(toPgPlaceholders(sql), bind(params));
      return { changes: Number(r.rowCount ?? r.affectedRows ?? 0) };
    },
    async exec(sql: string) {
      await client.query(sql);
    },
    async close() {
      if (client.end) await client.end();
      else if (client.close) await client.close();
    }
  };
}

export async function openPostgres(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 5 });
  return wrapPostgres(pool as unknown as PgQueryable);
}
