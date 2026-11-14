# Equipe e agentes — quem faz o quê

## Pessoas

| quem | papel | canais | decide |
|---|---|---|---|
| **Felipe Silva** | dono, estrategista de marca, "Head de operação" | `alo@madebyfelipe.com.br`, WhatsApp Business (15) 99283-5226 | oferta, preço, copy, ICP, depoimentos, merge na `beta`, retomar disparos, afrouxar regras |
| **Leonardo Rodrigues** | Head do Comercial / SDR | `leonardo@madebyfelipe.com.br` | executa ligações (painel de cold call), assina o cold mail do site grátis, envia réplicas |
| Clientes que revisam conteúdo | ex.: Dr. Milton e Dra. Francini (Alves & Nabuco) | — | aprovam o que sai assinado por eles (hoje a rotina auto-aprova) |

Papéis do campo `responsavel` no Twenty: `FELIPE`, `VENDEDOR`, `HEAD_MARKETING`,
`PROSPECT_RESEARCHER`.

## Agentes de IA

### OpenBot (servidor próprio, `/data/OpenBot/...`)

| agente | função | evidência |
|---|---|---|
| **Tyler** | ponto de contato/orquestrador: recebe pedidos do Felipe e repassa ("pedido do Felipe via Tyler") | i18n `/en`, pausa do painel, envios avulsos aprovados |
| **Casey** | features do site e **lotes diários de blog** (5 posts por lote, com capa Magnific) | ~40 commits; branches `feat/blog-lote-AAAA-MM-DD-a/b`, `feat/site-en`, `feat/painel-*` |
| **Wren** | design e front-end (redesign da home, blog, contraste) | branches `wren/*` |
| **Dylan** | **cold mail** (campanha "site grátis"), fila `outreach/queue-email.sh`, relatório diário `campanha-email/benchmark.js` | notas "E-mail D0 enviado (Leonardo)" no Twenty |
| **Harbinger** | WhatsApp via **Evolution API** (instância `mbf`); recebe as respostas por WhatsApp | nota de 14/11 |
| `openbotgit[bot]` | faz merge de PRs do OpenBot quando autorizado | merges #19–#35 |

### Claude (Claude Code / claude.ai)

- Sessões do dia para site (`lpfds`), muitas abertas **pelo celular**.
- Rotinas agendadas (editorial A&N, reset de tokens; prospecção noturna e black berry desativadas).
- Faz commits em português, em branch própria; **merge só quando o Felipe pede**.

### Codex

- Protótipo do painel de campanhas (`previews/campanhas/`, arquivado) e a **rotina de cold
  call** (`docs/cold-call-rotina.md`, sugerida para seg–sex 07:00, agendada no Codex).

## Como o trabalho flui

```
Felipe (celular) ──► Tyler ──► Casey / Wren / Dylan / Harbinger
      │                              │
      └──► Claude (sessão) ──► branch ──► PR ──► Felipe aprova ──► merge na beta = no ar
```

- Pedido pequeno de site: sessão do Claude → branch → merge na `main`/`beta` quando o Felipe
  manda ("merge direto na main", "pode mergear quando terminar").
- Blog: Casey abre PR por lote → Felipe (ou `openbotgit[bot]`) faz merge.
- Vendas: Dylan envia, Harbinger cuida do WhatsApp, Leonardo conduz conversas e ligações,
  Felipe aprova envios avulsos e fecha.
- Todo envio, resposta ou decisão comercial vira **nota no Twenty** (é o diário da operação).

## Proposta de subagentes

Orquestrador em Fable 5.2 + executores em Sonnet/Haiku, com escada de modelo e revisores
separados de quem produz: ver `subagentes.md` e as definições em `agents/`.

## Para o harness

- **Um dono por tarefa.** Se o Dylan já envia o cold mail, o harness mede e rascunha, não envia.
- **Toda ação externa** (enviar, publicar, merge na `beta`, retomar disparo) passa pelo Felipe
  — salvo autorização explícita e durável para aquela rotina (como a editorial A&N).
- Repasse entre agentes por **nota no Twenty** ou **PR/issue**, nunca por memória de sessão.
- Teto de uso do Claude é compartilhado com o Felipe: trabalho pesado de madrugada
  (01h–06h), fora da janela dele.
