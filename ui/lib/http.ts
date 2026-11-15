import { cfg } from "./config";
import { currentUser, type User } from "./auth";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, status);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) || "local";
}

/**
 * Pedido que altera estado só vale se veio da própria Central: o cabeçalho
 * Origin tem de bater com a URL pública ou com o host do pedido. Junto com o
 * cookie SameSite=Lax, fecha a porta para outro site agir em nome do Felipe.
 */
export function sameOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (origin === cfg().publicUrl.origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Guarded = { user: User & { sessionHash: string }; error?: undefined } | { user?: undefined; error: Response };

/** Toda rota de API começa por aqui: origem conferida e sessão válida. */
export async function guard(req: Request): Promise<Guarded> {
  if (!sameOrigin(req)) return { error: fail("Origem não permitida.", 403) };
  const user = await currentUser();
  if (!user) return { error: fail("Sessão expirada. Entre de novo.", 401) };
  return { user };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    return (body && typeof body === "object" ? body : {}) as T;
  } catch {
    return {} as T;
  }
}

export function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
