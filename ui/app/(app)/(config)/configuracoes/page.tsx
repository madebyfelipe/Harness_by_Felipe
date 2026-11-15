import Link from "next/link";
import { cfg } from "@/lib/config";

export const metadata = { title: "Configurações" };

/*
 * Lista de configurações em cartões agrupados (como "Configurações do servidor"
 * do app do OpenBot). No celular é a porta de entrada; no computador, a barra
 * lateral já mostra os mesmos itens.
 */
const GRUPOS: { nome: string; itens: { href: string; label: string; nota: string }[] }[] = [
  {
    nome: "Central",
    itens: [
      { href: "/inicio", label: "Visão geral", nota: "o que precisa de você e o que está rodando" },
      { href: "/aprovacoes", label: "Aprovações", nota: "pedidos esperando o seu sim" },
      { href: "/registros", label: "Registros e uso", nota: "execuções, custo e auditoria" },
      { href: "/contexto", label: "Contexto", nota: "o que os agentes sabem do negócio" }
    ]
  },
  {
    nome: "IA e agentes",
    itens: [
      { href: "/provedores", label: "Provedores de IA", nota: "contas Claude, ChatGPT, DeepSeek" },
      { href: "/agentes", label: "Agentes", nota: "quem faz o quê e com qual autonomia" },
      { href: "/skills", label: "Habilidades", nota: "procedimentos que se repetem" },
      { href: "/rotinas", label: "Rotinas", nota: "o que roda sozinho e quando" }
    ]
  },
  {
    nome: "Conexões",
    itens: [
      { href: "/conectores", label: "Apps", nota: "servidores MCP ligados" },
      { href: "/navegadores", label: "Navegadores", nota: "um navegador por agente" },
      { href: "/cofre", label: "Cofre", nota: "chaves e logins" }
    ]
  },
  {
    nome: "Você",
    itens: [{ href: "/conta", label: "Conta e segurança", nota: "senha, passkey e sessões" }]
  }
];

export default function Configuracoes() {
  const vps = cfg().mode === "vps";
  return (
    <main className="main sets">
      <header className="sets__head">
        <span className="sets__logo" aria-hidden="true">
          C<i />
        </span>
        <span>
          <h1 className="sets__title">Configurações</h1>
          <span className="sets__state">
            <b>Online</b> · {vps ? "Central na VPS" : "Central nesta máquina"}
          </span>
        </span>
      </header>
      {GRUPOS.map((g) => (
        <section key={g.nome} className="sets__group" aria-labelledby={`g-${g.nome}`}>
          <h2 id={`g-${g.nome}`} className="sets__label">
            {g.nome}
          </h2>
          <ul className="sets__card">
            {g.itens.map((i) => (
              <li key={i.href}>
                <Link href={i.href}>
                  <span className="sets__text">
                    <span>{i.label}</span>
                    <small>{i.nota}</small>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
