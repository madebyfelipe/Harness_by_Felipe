/** Sobe junto com o servidor: liga a agenda de rotinas e fecha execuções interrompidas (só no runtime Node). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
  if (process.env.CENTRAL_SWEEP !== "0") {
    const { sweepStaleRuns } = await import("./lib/startup");
    void sweepStaleRuns();
  }
}
