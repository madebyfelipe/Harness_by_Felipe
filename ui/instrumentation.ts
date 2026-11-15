/** Sobe junto com o servidor: liga a agenda de rotinas (só no runtime Node). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
