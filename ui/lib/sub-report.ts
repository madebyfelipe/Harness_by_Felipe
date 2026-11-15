/**
 * O SDK entrega o relatório do subagente embrulhado num aviso ("[Subagent hand-back] …
 * The report follows:") com as linhas indentadas e as tags neutralizadas. Para o
 * Felipe ler, fica só o relatório.
 */
export function cleanSubReport(raw: string): string {
  let s = raw;
  const at = s.indexOf("The report follows:");
  if (at >= 0) {
    s = s.slice(at + "The report follows:".length).replace(/^\s*\n/, "");
    s = s
      .split("\n")
      .map((l) => (l.startsWith("  ") ? l.slice(2) : l))
      .join("\n");
  }
  s = s.replace(/^\[harness:[^\n]*\]\s*/i, "");
  s = s.replace(/<\\\//g, "</").replace(/<\\/g, "<");
  s = s.replace(/\n*agentId:[\s\S]*$/i, "");
  return s.trim();
}
