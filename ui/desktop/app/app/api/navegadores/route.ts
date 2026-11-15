import { guard, json } from "@/lib/http";
import { listBrowsers } from "@/lib/browsers";
import { listAgents } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json({ browsers: await listBrowsers(), agents: listAgents().filter((a) => a.browser && !a.paused).map((a) => a.name) });
}
