# Skills, conectores e ferramentas

_Levantado em 14/11/2026 na conta do Felipe._

## 1. Skills que você tem e usa

### Suas (criadas por você)

| skill | o que faz | uso no harness |
|---|---|---|
| **`analise-cro-benchmark-v4`** | Deck de Diagnóstico CRO + Benchmark no template V4: análise do site do cliente, 3 pontos de aplicação por concorrente, prints da 1ª dobra e PageSpeed | **Venda consultiva**: anexar ao follow-up de lead quente ou à proposta do site; base de uma skill "diagnóstico do site da psicóloga" |
| `figma-implement-design` | Figma → código com fidelidade 1:1 | Site: implementar telas/LPs desenhadas no Figma |

### Guardadas no Drive (`.agents/skills`, abr/2026)

- `remotion-best-practices` — vídeo programático com Remotion (reels/vídeos de cliente).

### Da Anthropic, habilitadas

`docs` · `pdf` · `docx` · `pptx` · `xlsx` · `google-workspace` · `deep-research` ·
`morning` (briefing matinal) · `skill-creator` · `canvas-design` · `algorithmic-art` ·
`brand-guidelines` · `computer-use` · `chrome-browser` · `built-in-browser` · `import-memory`.

Mais úteis aqui: **`morning`** (base do briefing comercial), **`deep-research`** (pesquisa
de mercado/concorrência para a etapa "Pesquisa" da imersão), **`skill-creator`** (para
criar as skills da seção 3), **`pptx`/`docs`** (propostas e brand guides),
**`chrome-browser`** (operar RD Station, Meta Ads, hPanel, que não têm conector).

### Disponíveis nesta sessão (plugins do ambiente)

- **small-business**: `speed-to-lead`, `lead-triage`, `call-list`, `outreach-composer`,
  `grow-pipeline`, `lead-finder`, `crm-autopilot`, `proposal-builder`, `reactivate`,
  `review-reputation`, `seo-ai-visibility`, `social-content-engine`, `content-strategy`,
  `ad-manager`, `inbox-manager`, `monday-brief`, `business-pulse`, `growth-pulse`,
  `build-agent`, `build-connector`, `report-pack`, `invoice-chase`, `cash-flow-snapshot`…
  ⚠️ Vários pressupõem **HubSpot/QuickBooks/Stripe**; o seu CRM é o **Twenty**. Usar como
  referência de fluxo, não direto. Os que mais encaixam: `speed-to-lead`, `call-list`,
  `reactivate`, `seo-ai-visibility`, `ad-manager` (com CSV do Meta), `build-agent`.
- **design**: `ux-copy`, `accessibility-review`, `design-critique`, `design-system`,
  `design-handoff`, `user-research`, `research-synthesis`.
- **figma**: `figma-use`, `figma-generate-design`, `figma-design-to-code`,
  `figma-generate-library`, `figma-use-slides`…
- Do Claude Code: `code-review`, `security-review`, `simplify`, `run`, `loop`,
  `session-start-hook`, `fewer-permission-prompts`.

### Skills que você descreveu e que agora estão escritas (pasta `skills/`)

| skill | o que faz |
|---|---|
| [`pesquisa-de-preco`](skills/pesquisa-de-preco/SKILL.md) | preço do mercado de cada iniciativa (por cidade/estado/país), mediana por região, faixa competitiva |
| [`validacao-de-oferta`](skills/validacao-de-oferta/SKILL.md) | compara a oferta da campanha com a oferta principal (marca para psicólogas) e dá veredito |
| [`email-personalizado`](skills/email-personalizado/SKILL.md) | voz, assinatura (Felipe profissional / Leonardo vendedor), formato, limites |

Para instalar no Claude Code: copiar cada pasta para `.claude/skills/` do projeto (ou
`~/.claude/skills/`). Os subagentes estão em `agents/` (copiar para `.claude/agents/`).

## 2. Conectores

| conector | estado | uso |
|---|---|---|
| **Twenty** (CRM próprio, `crm.madebyfelipe.agency`) | ✅ conectado | Banco de leads, campanhas, notas, workflows. **Peça central** |
| **Magnific** (Freepik) | ✅ | Fotos de banco licenciadas (capas do blog, home, editorial A&N) — `stock_search → stock_get → stock_download`. Sem imagem de IA no site |
| **Google Calendar** (`alo@`) | ✅ | Agenda (entregas A&N, reuniões) |
| **Google Drive** (`alo@`) | ✅ | Entregas de cliente (PrismaPay, A&N), transcrições |
| **ClickUp** | ✅ | Espaços "Comercial" (lista Área de vendas) e "Operacional" (Tarefas, ~100+ abertas) |
| **Trello** | ✅ | 1 quadro ("LOTUS · AGÊNCIA", legado de dez/2025) |
| **Figma** | ✅ | Design |
| **onepagelove** | ✅ | Referências de seções/LPs (usado nas LPs e na home) |
| **Excalidraw** | ✅ | Diagramas |
| **Gmail** | ⚠️ conectado, mas respondeu "Mail service not enabled" | O e-mail do domínio é **Hostinger** (IMAP/SMTP), não Gmail — não dá para ler caixa por aqui |
| **OpenSEO** | ❌ precisa reconectar | Posições/SEO do blog |
| **Postiz** | ❌ precisa reconectar | Agendamento de posts em redes |
| GitHub | ✅ (sessão) | `lpfds`; outros repos via `add_repo` (`advocacia_an`, `blackberry-dashboard`…) |
| Spotify, Indeed, Dice, ZipRecruiter | ✅ | Fora do escopo |
| HubSpot, DocuSign, Xero, Zoom, Asana (plugins) | ❌ falha de conexão | Não usados |

Sem conector (operado por navegador, API própria ou agente): Vercel, Hostinger (hPanel,
caixas), Make, Evolution API (WhatsApp), RD Station, Meta Ads, Kommo, Search Console.

## 3. Skills a criar para o harness

Prioridade pelo impacto em venda. Todas em pt-BR, herdando as regras de `contexto.md`.

| # | skill | gatilho | o que faz | por quê |
|---|---|---|---|---|
| 1 | **`rascunho-site-gratis`** | lead aceitou a prévia | Lê site/Instagram da psicóloga, monta o rascunho de página única no padrão do `/exemplo/site-psicologa`, com copy revisada pelo art. 20, e publica num link privado para o Leonardo enviar | É a oferta que **converte** hoje (1 ganho, campanha com 706 leads); hoje é manual |
| 2 | **`responder-lead`** | resposta chegou (painel, Dylan ou WhatsApp) | Classifica e rascunha a réplica pelo playbook de `vendas.md`, com os números atuais da oferta; nunca envia | Tira o gargalo do Felipe sem perder o controle humano |
| 3 | **`proposta-comercial`** | conversa feita | Gera a proposta (imersão ou site) com os números aprovados, a partir do deck-fonte, em PDF/Docs | Hoje a proposta vive num PDF genérico |
| 4 | **`briefing-comercial`** | 07:30 seg–sex | O briefing da seção 2 de `rotinas.md`, lendo Twenty + Agenda | Uma tela por dia |
| 5 | **`guarda-oferta`** | oferta muda / semanal | Varre todas as superfícies (site, LPs, banner, JSON-LD, og, Twenty, textos do Dylan) atrás de número antigo | A mudança de 13/11 passou por 78 arquivos e ainda não foi para o ar |
| 6 | **`post-blog-psico`** | pauta nova | Escreve post no formato do repo (summary, faq, tags, capa Magnific, CTA, art. 20, fontes CFP) e abre PR | Padroniza o que a Casey faz e permite revisão automática |
| 7 | **`checagem-site`** | sexta / após merge | build + axe + consentimento + deploy Production + formulários | Hoje "pronto" às vezes é dito sem abrir no navegador |
| 8 | **`diagnostico-site-psicologa`** | lead quente | Versão enxuta do `analise-cro-benchmark-v4` para o site de uma psicóloga (1ª dobra, clareza para pais, Google, art. 20) | Gancho de follow-up e de venda do site |
| 9 | **`higiene-crm`** | mensal | Duplicados, origem/campanha faltando, LGPD | 39 pessoas sem origem/campanha; 2 oportunidades só |

Para criar: use `skill-creator` (com evals) e registre a skill no `CLAUDE.md`/README do
harness.

## Complemento: skills do OpenBot (íntegra em `openbot/skills.md`)

16 skills na biblioteca do OpenBot. As que mais importam para o harness:

| skill | uso |
|---|---|
| Disparos de e-mail pelo webmail (v4) | base do Dylan: SMTP/IMAP pelos scripts de `outreach/`, Enviados como fonte da verdade |
| Consultas REST no CRM Twenty | bash + curl (o servidor não tem Python nem jq) |
| Carga de captura no CRM | sobe planilha do Google Maps, deduplica |
| Segmentação de leads no CRM | amostras e listas de cold call |
| Medição de campanha (`benchmark.js`) | relatório por canal, variante, caixa, etapa |
| Verificação de perfis do Instagram (v2) · Busca de e-mail público | captação sem bloqueio de conta e sem ferramenta paga |
| Envio WhatsApp pela Evolution API | confere `open`, envia, verifica |
| carrossel-made-by-felipe (v4) · carousel-writer-sms | carrosséis do Instagram no estilo da marca |
| Redesign de site por referência | recriar seção a partir do One Page Love |
| Account Brief · Outreach Draft · Evidence Brief | pacote geral de vendas/pesquisa |

As skills do harness (`pesquisa-de-preco`, `validacao-de-oferta`, `email-personalizado`)
podem ser instaladas no OpenBot pelo `openbot-skill-creator`.
