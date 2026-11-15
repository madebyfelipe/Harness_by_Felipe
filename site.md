# Manutenção do site — `www.madebyfelipe.com.br`

Fonte da verdade técnica: **`CLAUDE.md` do repositório** (~900 linhas). Este arquivo é o
resumo operacional para o agente de site.

## Stack e hospedagem

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript. CSS global por área (sem
  Tailwind, sem CSS modules). GSAP + Lenis na home, ScrollReveal no legado.
- Repo `madebyfelipe/lpfds` (**público**). Hospedagem **Vercel**, projeto `lpfds`.
- Dependências de servidor: nodemailer, imapflow, mailparser, `@anthropic-ai/sdk`.
- Testes: `node --test tests/*.test.mjs`, `tests/cold-call.integration.cjs`
  (Playwright), `npm run build` (typecheck + build). Não há suíte de unidade completa.

## Branches e deploy (o ponto mais perigoso)

| branch | papel |
|---|---|
| **`beta`** | **produção** desde 13/11/2026 — merge aqui publica no domínio |
| `main` | só gera Preview na Vercel. Em 14/11 está **2 commits à frente** da `beta` (oferta nova + foto) |
| feature branches | Preview. **Nunca promover deploy de feature para Produção** (pode estar atrás da `beta`) |

Conferir se um merge foi para produção:
`gh api "repos/madebyfelipe/lpfds/deployments?sha=<sha>" --jq '.[].environment'` → tem
que mostrar `Production`.

Domínio canônico: `lib/site.ts` (`SITE_URL`). Sem `www` é o WordPress antigo (404).

## Mapa de rotas

**Institucional** (`app/(institucional)/`): `/` (home clone do Monolog), `/metodologia`,
`/projetos`, `/blog`, `/blog/[slug]`, `/cases`, `/privacidade`, `/cookies`, `/termos`,
`/reembolso`.
**Inglês** (`app/(en)/en/`): `/en`, `/en/method`, `/en/website-process`, `/en/contact`.
**LP** (noindex, fora do sitemap): `/lp/site`.
**Outros**: `/hub` (link da bio + e-book), `/portfolio` + `/portfolio/[slug]` (vitrine
profissional — não usar como fonte de venda), `/contato` (satélite do hub — **não mexer**),
`/exemplo/site-psicologa`.
**Painel** (HTTP Basic): `/painel/identidade` (assinaturas de e-mail).

**Legado (15/11/2026)** — ainda no código, fora da oferta ativa; não linkar, não promover,
candidatos a remoção: `/diagnostico` (descartado), `/r/[token]` (rastreio descartado),
`/painel/campanhas` (prospecção foi para o OpenBot), `/webinar`, `/recem-formados`,
`/imersao` e `/lp/marca` (imersão sem confirmação), `/painel/cold-call`.

**Âncoras que não podem sumir da home:** `#processo` e `#servicos` (linkadas do `/hub` e de bios).

## APIs e crons

Ativas: `/api/lp-lead`, `/api/newsletter`, `/api/comentarios`, `/api/email-health`.
Legado: `/api/diagnostico`, `/api/webinar` (+ `/reminders`), `/api/prospeccao/*`
(inclui `disparo` e `link-clique`), `/api/cold-call/rotina`, `/painel/api/*` da prospecção,
`/api/imersao` (sem confirmação).

Crons Vercel (`vercel.json`, UTC): webinar 12:00 e disparo de prospecção 12:00/14:00/17:00
seg–sex — **ambos legado**; remover quando limpar o código.

Variáveis de ambiente (nomes): `SMTP_*`, `TWENTY_BASE_URL`, `TWENTY_API_KEY`,
`TWENTY_WEBINAR_WEBHOOK`, `CRON_SECRET`, `PAINEL_USUARIO`, `PAINEL_SENHA`,
`PROSPECCAO_*` e `CLIQUE_SECRET` (legado), `ANTHROPIC_API_KEY` (IA do painel, legado).

## Design system (resumo do que o agente mais erra)

- Tokens são a fonte da verdade; **nunca valor cru**. Falta token → cria token com comentário.
- Paleta institucional: cream, black, red `#bc0319` (+ `--red-dark`), rampa de cinzas.
  Na estética Monolog atual: pedra `#e8e8e3` / quase-preto `#080807` (`--m-*`).
  **Quatro cores, não invente a quinta.** Vermelho só como ênfase (`.mh-red`), marcador
  de rótulo e card "45/30".
- `--red` = preenchimento · `--red-ink` = tinta (sempre `#bc0319`) · `--link-ink` =
  link em texto corrido · `--on-red` = texto sobre vermelho (fixo, não inverte).
- Raio **2px**, nunca pílula (exceção declarada: `/hub`). Botão `16px 32px`, 14/700/0.04em,
  caixa alta. Kicker mono com ponto vermelho.
- Fonte: só **Neue Haas Grotesk Display** (TTFs em `public/fonts/`, licenciada).
- **Tema escuro** troca papéis de cream/black; toda cor nova funciona nos dois.
- **Contraste**: 4.5:1 texto / 3:1 gráfico, nos dois temas. Projeto em **zero violações
  axe-core (WCAG 2.1 AA)** — manter.
- Checklist de componente novo: token de cor? raio 2px? rótulo caixa alta com tracking?
  dois temas? contraste nos dois? foco visível?

## Conteúdo: onde mexer

| o quê | arquivo |
|---|---|
| Copy aprovada do institucional (método, processo, entregas) | `lib/institucional.ts` (**não reescrever**) |
| Depoimentos | também em `lib/institucional.ts` — **fictícios, sair do site** (decisão 15/11); substituir por avaliações do Google anônimas quando o Felipe mandar |
| Copy em inglês | `lib/institucional-en.ts`, `lib/i18n.ts` (pares de rota + hreflang) |
| Portfólio (vitrine, só manutenção técnica) | `lib/portfolio.ts` + `public/portfolio/<slug>/` |
| Posts | `content/blog/<slug>.tsx` + registrar em `lib/blog.ts` |
| Temas do blog / anúncios do post | `lib/blog-temas.ts`, `lib/blog-ads.ts` |
| Quiz da LP | `lib/lp.ts` |
| Dados legais | `lib/legal.ts` |
| Newsletter / e-book | `lib/newsletter.ts` |

Oferta (números) aparece em: hero/pops/metadata/FAQ da home, `process`, hub, LP do site,
banner do blog, JSON-LD, `og.png`, `/reembolso` e no parágrafo "Como o estúdio trabalha"
de cada post. **Mudou a oferta → varrer todos.**

## Blog (o que mais muda)

- 75+ posts, lotes diários de 5 (lote A/B) feitos pela Casey (OpenBot) via PR.
- Post não cita depoimento, cliente do portfólio, diagnóstico gratuito nem imersão.
- Cada post: `slug`, `title` (com palavra-chave, vira H1), `description`, `keyword`,
  `publishedAt`, `tags` (≥1, senão o build falha), `summary` (resposta rápida), `faq`
  (3–4), `body` JSX, `cover` opcional.
- Capa: `public/blog/<slug>/<palavra-chave>.jpg`, 16:9, ≥1920×1080, ≤~500 KB, alt ≥15
  caracteres; `assertCover` derruba o build se fugir. Sem capa → og gerado com título.
- Termina com "— Próximo passo" + `ScheduleLink`. FAQ no fim, não repetir h2.
- Slug, título e description únicos (build trava).
- Padrão SEO observado (`docs/seo-concorrentes.md`): 1.200–3.400 palavras, número no
  título, tabelas pode/não pode, FAQ real do "As pessoas também perguntam", autor com foto.
  Já em 1º para "marca para psicólogo autismo", 3º "branding para psicólogos", 4º
  "psicólogo pode divulgar preço" (busca de 12/11).

## Verificação antes de dizer "pronto"

1. `npm run build` limpo.
2. axe-core nas rotas × 2 temas + estados (banner de cookies, modal do e-book, erro de
   form): **0 violações**.
3. Consentimento: `/hub` com `mbf-consent=denied` → **zero** requisições a
   facebook/tiktok/instagram.
4. Conferir no navegador o que mudou, em desktop **e celular** (Felipe usa muito o celular).
5. Neste ambiente, `pkill` do servidor e `npm run start` em chamadas separadas.
6. Depois do merge na `beta`: confirmar deploy `Production`.

## Armadilhas já pisadas (não repetir)

- `--nav-bg` com alfa deixava texto passar por trás da nav (sem backdrop-filter).
- Scrim do menu mobile engolia todos os toques da home (corrigido em 14/11).
- Imagens `loading="lazy"` em carrossel com transform nunca carregavam.
- Itens `display:none` em stagger do GSAP travavam o botão Menu.
- `openGraph` não mescla entre layout e página: repetir `images: [OG_IMAGE]`.
- Cache da Vercel em imagem: trocar arquivo com **nome novo** (`gap-5-v2.jpg`).
- Fotos do Felipe vieram em ~736px — trocar por originais quando houver.
- `/sobre` foi criado e removido a pedido — **não recriar**. Grade de marcas e cases na
  home: Felipe tirou — **não recolocar**.
