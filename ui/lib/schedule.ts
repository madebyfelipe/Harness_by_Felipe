/*
 * Agenda das rotinas: frase simples em português → cron, e próximas execuções no fuso
 * America/Sao_Paulo (o servidor roda em UTC; isso já causou erro de horário no OpenBot).
 * Cron de 5 campos: minuto hora dia-do-mês mês dia-da-semana (0 = domingo).
 */

export const TZ = "America/Sao_Paulo";

const DIAS: [RegExp, number][] = [
  [/\bdom(ingo)?s?\b/, 0],
  [/\bseg(unda)?s?(-feira)?\b/, 1],
  [/\bter(ca|ça)?s?(-feira)?\b/, 2],
  [/\bqua(rta)?s?(-feira)?\b/, 3],
  [/\bqui(nta)?s?(-feira)?\b/, 4],
  [/\bsex(ta)?s?(-feira)?\b/, 5],
  [/\bsab(ado)?s?\b/, 6]
];
const NOMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** "dias úteis às 05:30" → { cron: "30 5 * * 1-5", texto } . Lança com o motivo. */
export function parseQuando(input: string): { cron: string; texto: string } {
  const raw = input.trim();
  if (/^[\d*/,-]+( [\d*/,-]+){4}$/.test(raw)) {
    validateCron(raw);
    return { cron: raw, texto: describeCron(raw) };
  }
  const s = strip(raw);
  if (!s) throw new Error("Diga quando: ex. \"dias úteis às 05:30\".");

  let m = /a cada (\d+) ?min/.exec(s);
  if (m) {
    const n = Number(m[1]);
    if (n < 5 || n > 59) throw new Error("A cada N minutos: use de 5 a 59.");
    const cron = `*/${n} * * * *`;
    return { cron, texto: describeCron(cron) };
  }
  m = /a cada (\d+) ?h/.exec(s);
  if (m || /de hora em hora|toda hora|a cada hora/.test(s)) {
    const n = m ? Number(m[1]) : 1;
    if (n < 1 || n > 23) throw new Error("A cada N horas: use de 1 a 23.");
    const cron = `0 ${n === 1 ? "*" : `*/${n}`} * * *`;
    return { cron, texto: describeCron(cron) };
  }

  // Hora: 05:30, 5h30, 7h, 19 horas, meio-dia, meia-noite.
  let hh: number | null = null;
  let mm = 0;
  if (/meio[ -]dia/.test(s)) hh = 12;
  else if (/meia[ -]noite/.test(s)) hh = 0;
  else {
    const t = /(?:as |a |às )?(\d{1,2})(?::(\d{2})|h(\d{2})?| ?horas?)/.exec(s);
    if (t) {
      hh = Number(t[1]);
      mm = Number(t[2] ?? t[3] ?? 0);
    }
  }
  if (hh === null) throw new Error("Faltou a hora: ex. \"às 07:30\".");
  if (hh > 23 || mm > 59) throw new Error("Hora inválida.");

  // Dias.
  let dow = "*";
  let dom = "*";
  const diaMes = /\bdia (\d{1,2})\b/.exec(s);
  if (diaMes) {
    const d = Number(diaMes[1]);
    if (d < 1 || d > 31) throw new Error("Dia do mês inválido.");
    dom = String(d);
  } else if (/dias? ute(is|l)|seg(unda)?(-feira)? a sex(ta)?|de segunda a sexta/.test(s)) dow = "1-5";
  else if (/fim de semana|fins de semana/.test(s)) dow = "0,6";
  else if (!/todo (o )?dia|todos os dias|diariamente/.test(s)) {
    const picked = DIAS.filter(([re]) => re.test(s)).map(([, n]) => n);
    if (picked.length) dow = [...new Set(picked)].sort().join(",");
  }
  const cron = `${mm} ${hh} ${dom} * ${dow}`;
  return { cron, texto: describeCron(cron) };
}

function field(value: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of value.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    let [a, b] = range === "*" ? [min, max] : range.split("-").map(Number);
    if (b === undefined) b = stepRaw ? max : a;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < min || b > max || a > b || !Number.isInteger(step) || step < 1) throw new Error(`Campo de cron inválido: ${value}`);
    for (let i = a; i <= b; i += step) out.add(i);
  }
  return out;
}

export function validateCron(cron: string): void {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) throw new Error("Cron precisa de 5 campos.");
  field(f[0], 0, 59);
  field(f[1], 0, 23);
  field(f[2], 1, 31);
  field(f[3], 1, 12);
  field(f[4], 0, 6);
}

export function describeCron(cron: string): string {
  const [mi, ho, dom, , dow] = cron.split(/\s+/);
  const hora = /^\d+$/.test(ho) && /^\d+$/.test(mi) ? `às ${ho.padStart(2, "0")}:${mi.padStart(2, "0")}` : mi.startsWith("*/") ? `a cada ${mi.slice(2)} minutos` : ho.startsWith("*/") ? `a cada ${ho.slice(2)} horas` : ho === "*" ? "de hora em hora" : cron;
  let dias = "todo dia";
  if (dom !== "*") dias = `todo dia ${dom}`;
  else if (dow === "1-5") dias = "dias úteis";
  else if (dow === "0,6") dias = "fim de semana";
  else if (dow !== "*") dias = dow.split(",").map((d) => NOMES[Number(d)] ?? d).join(", ");
  return `${dias} ${hora} (Brasília)`;
}

/** Partes de data/hora em Brasília para um instante. */
function partsBR(d: Date): { y: number; mo: number; da: number; h: number; mi: number; wd: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return { y: +p.year, mo: +p.month, da: +p.day, h: +p.hour, mi: +p.minute, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

/** Próximas `n` execuções depois de `from` (instantes UTC). */
export function nextRuns(cron: string, n = 5, from = new Date()): Date[] {
  const [fm, fh, fd, fmo, fw] = cron.trim().split(/\s+/);
  const M = field(fm, 0, 59);
  const H = field(fh, 0, 23);
  const D = field(fd, 1, 31);
  const MO = field(fmo, 1, 12);
  const W = field(fw, 0, 6);
  const out: Date[] = [];
  const t = new Date(Math.floor(from.getTime() / 60_000) * 60_000 + 60_000);
  // Pula horas inteiras que não batem, para não avaliar minuto a minuto o ano todo.
  for (let i = 0; i < 60 * 24 * 400 && out.length < n; ) {
    const p = partsBR(t);
    if (!MO.has(p.mo) || !D.has(p.da) || !W.has(p.wd) || !H.has(p.h)) {
      const step = 60 - p.mi;
      t.setTime(t.getTime() + step * 60_000);
      i += step;
      continue;
    }
    if (M.has(p.mi)) out.push(new Date(t));
    t.setTime(t.getTime() + 60_000);
    i += 1;
  }
  return out;
}

/** Última execução prevista em ou antes de `at` (dentro das últimas `withinMin`). */
export function lastSlot(cron: string, at = new Date(), withinMin = 15): Date | null {
  const runs = nextRuns(cron, 20, new Date(at.getTime() - withinMin * 60_000 - 60_000)).filter((r) => r.getTime() <= at.getTime());
  return runs.length ? runs[runs.length - 1] : null;
}

export function fmtBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Roda entre 00:00 e 05:29 em Brasília: abre a janela de uso antes do reset das 05:30. */
export function opensWindowEarly(d: Date): boolean {
  const p = partsBR(d);
  return p.h < 5 || (p.h === 5 && p.mi < 30);
}
