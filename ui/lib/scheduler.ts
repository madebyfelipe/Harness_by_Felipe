import { kvGet, kvSet } from "./db";
import { listRoutines, runRoutine, runsHere } from "./routines";
import { lastSlot } from "./schedule";

/*
 * Agendador das rotinas, dentro do processo da Central (sobe com o servidor, ver
 * instrumentation.ts). A cada 30 s olha cada rotina ativa desta instância; se há uma
 * execução prevista nos últimos 15 min que ainda não rodou, dispara. Execução perdida há
 * mais tempo (servidor desligado) não é refeita.
 */

const g = globalThis as unknown as { __centralScheduler?: NodeJS.Timeout };

async function tick(): Promise<void> {
  // Mensagens agendadas no chat (e as da fila esperando vaga).
  await import("./queue").then((q) => q.dispatchDue()).catch((e) => console.error("[central] fila:", e));
  const now = new Date();
  for (const r of listRoutines().routines) {
    if (!r.ativa || !runsHere(r)) continue;
    const slot = lastSlot(r.cron, now, 15);
    if (!slot) continue;
    const key = `rotina.ultimo.${r.nome}`;
    const last = await kvGet(key);
    if (last && last >= slot.toISOString()) continue;
    await kvSet(key, slot.toISOString());
    console.log(`[central] rotina ${r.nome} (${slot.toISOString()})`);
    await runRoutine(r, "agenda").catch((e) => console.error(`[central] rotina ${r.nome} não iniciou:`, e instanceof Error ? e.message : e));
  }
}

export function startScheduler(): void {
  if (g.__centralScheduler || process.env.CENTRAL_SCHEDULER === "0") return;
  g.__centralScheduler = setInterval(() => void tick().catch((e) => console.error("[central] agenda:", e)), 30_000);
  g.__centralScheduler.unref?.();
  setTimeout(() => void tick().catch(() => undefined), 5_000).unref?.();
  console.log("[central] agenda de rotinas ligada (America/Sao_Paulo)");
}
