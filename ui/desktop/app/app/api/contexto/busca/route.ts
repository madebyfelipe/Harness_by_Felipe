import { guard, json } from "@/lib/http";
import { searchContext } from "@/lib/repo";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 200);
  return json({ hits: searchContext(q) });
}
