"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATALOG, CATEGORIES, type CatalogItem } from "@/lib/catalog";
import { api } from "./api";
import { IconPlus, IconSearch } from "./Icons";

type Step = { nome: string; ok: boolean; detalhe: string };
type Connector = {
  nome: string;
  titulo: string;
  tipo: string;
  uso: string;
  segredo: string;
  agentes: string[];
  mcp?: { nome: string; url: string; transporte: string };
  file: string;
  secretState: "nao_usa" | "definido" | "ausente";
  status: { ok: number; detail: string; checked_at: string } | null;
};
type Wa = { config: { url: string; instancia: string; numero: string; temChave: boolean }; state: { ok: boolean; state: string; detail: string; self?: boolean } };

const when = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function Icon({ cor, letra }: { cor: string; letra: string }) {
  return (
    <span className="card__icon" style={{ background: cor }} aria-hidden="true">
      {letra}
    </span>
  );
}

function stateOf(c?: Connector): { dot: string; text: string } {
  if (!c) return { dot: "dot--off", text: "" };
  if (c.secretState === "ausente") return { dot: "dot--alert", text: `falta a chave (${c.segredo})` };
  if (!c.status) return { dot: "dot--off", text: "conectado · ainda não testado" };
  return c.status.ok ? { dot: "", text: "funcionando" } : { dot: "dot--alert", text: "com problema" };
}

export function AppsCatalog({ agents }: { agents: string[] }) {
  const [list, setList] = useState<Connector[] | null>(null);
  const [fileErrors, setFileErrors] = useState<{ file: string; error: string }[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string>("");
  const [testing, setTesting] = useState("");
  const [results, setResults] = useState<Record<string, Step[]>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState<{ nome: string; titulo: string; uso: string; tipo: "mcp" | "rest"; segredo: string; saude: string } | null>(null);
  const [wa, setWa] = useState<Wa | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ connectors: Connector[]; errors: { file: string; error: string }[] }>("/api/conectores");
      setList(r.connectors);
      setFileErrors(r.errors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar.");
    }
    api<Wa>("/api/whatsapp")
      .then(setWa)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byName = useMemo(() => Object.fromEntries((list ?? []).map((c) => [c.nome, c])), [list]);
  const known = new Set(CATALOG.map((i) => i.conector).filter(Boolean));
  const extras = (list ?? []).filter((c) => !known.has(c.nome));
  const match = (text: string) => !q.trim() || text.toLowerCase().includes(q.trim().toLowerCase());

  async function test(nome: string) {
    setTesting(nome);
    setError("");
    try {
      const r = await api<{ result: { steps: Step[] } }>(`/api/conectores/${nome}/testar`, { method: "POST" });
      setResults((x) => ({ ...x, [nome]: r.result.steps }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O teste falhou.");
    } finally {
      setTesting("");
    }
  }

  async function remove(nome: string) {
    if (!window.confirm(`Remover o conector "${nome}"? O arquivo sai do repositório (fica no histórico do git).`)) return;
    setError("");
    try {
      await api(`/api/conectores/${nome}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover.");
    }
  }

  async function saveSecret(name: string, value: string) {
    setError("");
    try {
      await api("/api/cofre", { body: { name, value } });
      setNote(`Chave ${name} guardada no cofre da Central.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar.");
    }
  }

  async function addCustom(form: HTMLFormElement) {
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setNote("");
    try {
      const picked = data.getAll("agentes").map(String);
      const r = await api<{ commit: { committed: boolean; commit?: string; pushed: boolean; note?: string } }>("/api/conectores", {
        body: {
          tipo: custom?.tipo ?? "mcp",
          nome: data.get("nome"),
          titulo: data.get("titulo"),
          url: data.get("url"),
          saude: data.get("saude"),
          transporte: data.get("transporte"),
          segredo: data.get("segredo"),
          uso: data.get("uso"),
          agentes: picked.length ? picked : ["*"]
        }
      });
      const value = String(data.get("valor") ?? "").trim();
      const secretName = String(data.get("segredo") ?? "").trim();
      if (value && secretName) await api("/api/cofre", { body: { name: secretName, value } });
      const c = r.commit;
      setNote(c.committed ? `Salvo no repositório (commit ${c.commit}${c.pushed ? ", enviado" : `, não enviado: ${c.note}`}).` : `Arquivo gravado, sem commit: ${c.note}`);
      form.reset();
      setCustom(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function startCustom(item?: CatalogItem) {
    setCustom({
      nome: item?.id ?? "",
      titulo: item?.nome ?? "",
      uso: item?.modelo?.uso ?? item?.descricao ?? "",
      tipo: item?.acao === "rest" ? "rest" : "mcp",
      segredo: item?.modelo?.segredo ?? "",
      saude: item?.modelo?.saude ?? ""
    });
    setTimeout(() => document.getElementById("personalizado")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function ConnectedDetail({ c }: { c: Connector }) {
    const [val, setVal] = useState("");
    const steps = results[c.nome];
    return (
      <div className="card__detail">
        {c.uso ? <p className="small muted">{c.uso}</p> : null}
        <p className="small">
          {c.status ? `${c.status.ok ? "funcionando" : "com problema"} · ${c.status.detail} · ${when(c.status.checked_at)}` : "ainda não testado"}
        </p>
        <p className="mono small muted">
          {c.file} · agentes: {c.agentes.includes("*") ? "todos" : c.agentes.join(", ")}
          {c.mcp ? ` · mcp__${c.mcp.nome}__*` : ""}
        </p>
        {c.segredo ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (val.trim()) void saveSecret(c.segredo, val).then(() => setVal(""));
            }}
          >
            <label className="sr-only" htmlFor={`k-${c.nome}`}>
              Chave {c.segredo}
            </label>
            <input id={`k-${c.nome}`} className="field field--sm" style={{ flex: "1 1 220px" }} type="password" autoComplete="off" value={val} onChange={(e) => setVal(e.target.value)} placeholder={c.secretState === "definido" ? `${c.segredo} definido · cole para trocar` : `cole a chave ${c.segredo}`} />
            <button className="btn btn--sm" disabled={!val.trim()}>
              Guardar chave
            </button>
          </form>
        ) : null}
        {steps ? (
          <ul className="steps" aria-label="Resultado do teste">
            {steps.map((s) => (
              <li key={s.nome}>
                <span>
                  <b>{s.ok ? "ok" : "falhou"}</b> {s.nome}: {s.detalhe}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  function WhatsAppDetail() {
    const [url, setUrl] = useState(wa?.config.url ?? "");
    const [inst, setInst] = useState(wa?.config.instancia ?? "mbf");
    const [num, setNum] = useState(wa?.config.numero ?? "");
    const [key, setKey] = useState("");
    const [msg, setMsg] = useState("");
    const save = async () => {
      setMsg("");
      try {
        const r = await api<Wa>("/api/whatsapp", { body: { url, instancia: inst, numero: num, chave: key } });
        setWa(r);
        setKey("");
        setMsg(r.state.ok && !r.state.self ? "Salvo. WhatsApp conectado." : `Salvo. ${r.state.detail}`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Não salvou.");
      }
    };
    const test = async () => {
      setMsg("");
      try {
        const r = await api<{ detail: string }>("/api/whatsapp/teste", { method: "POST" });
        setMsg(`Teste enviado: ${r.detail}`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Não enviou.");
      }
    };
    return (
      <form
        className="card__detail stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="small muted">Os avisos saem pela sua instância da Evolution e vão só para o seu número. O número fica salvo nesta Central, não no repositório.</p>
        <label className="label" htmlFor="wa-url">
          URL da Evolution API
        </label>
        <input id="wa-url" className="field field--sm" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label className="label" htmlFor="wa-inst">
          Instância
        </label>
        <input id="wa-inst" className="field field--sm" value={inst} onChange={(e) => setInst(e.target.value)} />
        <label className="label" htmlFor="wa-num">
          Seu número (com DDI e DDD)
        </label>
        <input id="wa-num" className="field field--sm" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} placeholder="55 15 9…" />
        <label className="label" htmlFor="wa-key">
          Chave da Evolution API
        </label>
        <input id="wa-key" className="field field--sm" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={wa?.config.temChave ? "guardada · cole para trocar" : "cole a chave (apikey)"} />
        <div className="row">
          <button className="btn btn--sm">Salvar</button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={!wa?.state.ok || !num} onClick={() => void test()}>
            Enviar teste para mim
          </button>
        </div>
        {msg ? <p className="small">{msg}</p> : null}
      </form>
    );
  }

  function Card({ item }: { item: CatalogItem }) {
    const c = item.conector ? byName[item.conector] : undefined;
    const isWa = item.acao === "whatsapp";
    const waState = wa ? (wa.state.ok ? (wa.state.self ? { dot: "dot--alert", text: "conectado, mas não notifica" } : { dot: "", text: "conectado" }) : wa.config.temChave ? { dot: "dot--alert", text: wa.state.detail } : null) : null;
    const st = isWa ? waState : c ? stateOf(c) : null;
    const expanded = open === item.id;
    return (
      <li className="card" data-testid={c ? `conector-${c.nome}` : `app-${item.id}`}>
        <div className="card__row">
          <Icon cor={item.cor} letra={item.letra} />
          <div className="card__text">
            <span className="card__name">{item.nome}</span>
            <span className="card__desc">
              {st ? (
                <>
                  <span className={`dot ${st.dot}`} aria-hidden="true" /> {st.text}
                </>
              ) : (
                item.descricao
              )}
            </span>
          </div>
          {c ? (
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={testing !== ""} onClick={() => void test(c.nome)}>
                {testing === c.nome ? "Testando…" : "Testar"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? "" : item.id)}>
                {expanded ? "Fechar" : "Configurar"}
              </button>
            </div>
          ) : isWa ? (
            <button type="button" className="btn-connect" aria-expanded={expanded} onClick={() => setOpen(expanded ? "" : item.id)}>
              {waState ? (expanded ? "Fechar" : "Configurar") : <><IconPlus size={16} /> Conectar</>}
            </button>
          ) : item.acao === "breve" ? (
            <span className="small muted">em breve</span>
          ) : (
            <button type="button" className="btn-connect" onClick={() => startCustom(item)}>
              <IconPlus size={16} /> Conectar
            </button>
          )}
        </div>
        {expanded && c ? (
          <>
            <ConnectedDetail c={c} />
            <button type="button" className="link small" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", justifySelf: "start" }} onClick={() => void remove(c.nome)}>
              Remover
            </button>
          </>
        ) : null}
        {expanded && isWa ? <WhatsAppDetail /> : null}
      </li>
    );
  }

  return (
    <div className="stack stack--lg">
      <div className="toolbar">
        <div className="search">
          <IconSearch size={16} />
          <label className="sr-only" htmlFor="apps-q">
            Buscar apps
          </label>
          <input id="apps-q" type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn btn--light" onClick={() => startCustom()}>
          <IconPlus size={16} /> Adicionar personalizado
        </button>
      </div>

      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="notice notice--plain">{note}</p> : null}
      {fileErrors.map((f) => (
        <p className="notice" role="alert" key={f.file}>
          <span className="mono">{f.file}</span>: {f.error}
        </p>
      ))}
      {list === null ? <p className="muted">Carregando…</p> : null}

      {extras.filter((c) => match(`${c.titulo} ${c.uso}`)).length ? (
        <section className="cat">
          <h2 className="cat__head">
            Seus personalizados <span className="muted">{extras.length}</span>
          </h2>
          <ul className="cards">
            {extras
              .filter((c) => match(`${c.titulo} ${c.uso}`))
              .map((c) => (
                <Card key={c.nome} item={{ id: c.nome, nome: c.titulo, descricao: c.uso, categoria: "", cor: "#454545", letra: c.titulo.charAt(0).toUpperCase(), acao: "conector", conector: c.nome }} />
              ))}
          </ul>
        </section>
      ) : null}

      {CATEGORIES.map((cat) => {
        const items = CATALOG.filter((i) => i.categoria === cat && match(`${i.nome} ${i.descricao}`));
        if (!items.length) return null;
        return (
          <section className="cat" key={cat}>
            <h2 className="cat__head">
              {cat} <span className="muted">{items.length}</span>
            </h2>
            <ul className="cards">
              {items.map((i) => (
                <Card key={i.id} item={i} />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="stack" id="personalizado" aria-labelledby="novo-mcp">
        <h2 className="h2" id="novo-mcp">
          {custom?.titulo ? `Conectar ${custom.titulo}` : "Adicionar personalizado"}
        </h2>
        <p className="muted">
          Grava <span className="mono">connectors/&lt;nome&gt;.yaml</span> e faz commit. O arquivo leva só o nome da chave; o valor vai para o cofre da Central.
        </p>
        <form
          key={custom ? `${custom.nome}-${custom.tipo}` : "vazio"}
          className="form"
          style={{ maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            void addCustom(e.currentTarget);
          }}
        >
          <div>
            <label className="label" htmlFor="c-nome">
              Nome (minúsculas e hífen)
            </label>
            <input className="field" id="c-nome" name="nome" defaultValue={custom?.nome} pattern="[a-z0-9][a-z0-9\-]{1,39}" placeholder="ex.: magnific" required />
          </div>
          <div>
            <label className="label" htmlFor="c-titulo">
              Título
            </label>
            <input className="field" id="c-titulo" name="titulo" defaultValue={custom?.titulo} placeholder="ex.: Magnific (fotos de banco)" />
          </div>
          {custom?.tipo === "rest" ? (
            <div>
              <label className="label" htmlFor="c-saude">
                URL de teste (GET, https)
              </label>
              <input className="field" id="c-saude" name="saude" type="url" defaultValue={custom.saude} required />
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="c-url">
                  URL do servidor MCP (https)
                </label>
                <input className="field" id="c-url" name="url" type="url" placeholder="https://…/mcp" required />
              </div>
              <div>
                <label className="label" htmlFor="c-transporte">
                  Transporte
                </label>
                <select className="field" id="c-transporte" name="transporte" defaultValue="http">
                  <option value="http">HTTP (streamable)</option>
                  <option value="sse">SSE</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="c-segredo">
              Nome da chave (opcional)
            </label>
            <input className="field" id="c-segredo" name="segredo" defaultValue={custom?.segredo} pattern="[A-Z][A-Z0-9_]{2,63}" placeholder="ex.: MAGNIFIC_KEY" autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="c-valor">
              Valor da chave (vai para o cofre)
            </label>
            <input className="field" id="c-valor" name="valor" type="password" autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="c-uso">
              Para que serve
            </label>
            <input className="field" id="c-uso" name="uso" maxLength={300} defaultValue={custom?.uso} />
          </div>
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label">Agentes que podem usar (nenhum marcado = todos)</legend>
            <div className="tags">
              {agents.map((a) => (
                <label key={a} className="tag" style={{ cursor: "pointer" }}>
                  <input type="checkbox" name="agentes" value={a} /> {a}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn" disabled={saving}>
            {saving ? "Salvando…" : "Salvar e fazer commit"}
          </button>
        </form>
      </section>
    </div>
  );
}
