"use client";

/** fetch da Central: JSON na ida e na volta; erro vira Error com a mensagem do servidor. */
export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.body !== undefined || init.form ? "POST" : "GET"),
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    credentials: "same-origin",
    cache: "no-store"
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* sem corpo */
  }
  if (res.status === 401 && !url.startsWith("/api/auth") && !url.startsWith("/api/setup")) {
    window.location.href = "/entrar";
  }
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || `Erro ${res.status}`);
  }
  return data as T;
}
