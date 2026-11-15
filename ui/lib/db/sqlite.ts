import { DatabaseSync } from "node:sqlite";
import type { Db, Row } from "./types";

type Bindable = null | number | bigint | string | Uint8Array;

function bind(params: unknown[] = []): Bindable[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (typeof p === "number" || typeof p === "bigint" || typeof p === "string") return p;
    if (p instanceof Uint8Array) return p;
    return JSON.stringify(p);
  });
}

export function openSqlite(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  return {
    dialect: "sqlite",
    async all<T = Row>(sql: string, params?: unknown[]) {
      return db.prepare(sql).all(...bind(params)) as T[];
    },
    async get<T = Row>(sql: string, params?: unknown[]) {
      return db.prepare(sql).get(...bind(params)) as T | undefined;
    },
    async run(sql: string, params?: unknown[]) {
      const r = db.prepare(sql).run(...bind(params));
      return { changes: Number(r.changes) };
    },
    async exec(sql: string) {
      db.exec(sql);
    },
    async close() {
      db.close();
    }
  };
}
