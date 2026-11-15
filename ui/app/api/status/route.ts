import { guard, json } from "@/lib/http";
import { getStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json(await getStatus());
}
