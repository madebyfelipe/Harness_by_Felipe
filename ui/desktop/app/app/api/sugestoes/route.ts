import { guard, json } from "@/lib/http";
import { getSuggestions } from "@/lib/suggestions";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return json(await getSuggestions());
}
