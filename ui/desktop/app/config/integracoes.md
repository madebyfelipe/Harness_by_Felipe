# Integrações — mapa de sistemas

## Domínios

| domínio | uso |
|---|---|
| `www.madebyfelipe.com.br` | site (Vercel). Apex sem `www` = WordPress antigo, 404 nas APIs |
| `madebyfelipe.com.br` (e-mail) | `alo@` (contato, forms, SMTP do site, agenda/Drive Google), `leonardo@` |
| `madebyfelipe.agency` | `crm.` (Twenty), `file.` (mirror do e-book), caixas de prospecção (`contato@`, `felipe@` previsto) |

## Sistemas

| sistema | papel | como o agente acessa |
|---|---|---|
| **Twenty CRM** | banco de leads, campanhas (`campanhaProspeccao`), notas de operação, workflows | Conector MCP (`execute_tool`) · REST `crm.madebyfelipe.agency/rest` com `TWENTY_API_KEY` (servidor) |
| **Vercel** | hospedagem, crons, env vars, deploy (`beta` = produção) | `gh api .../deployments` para conferir; painel pelo navegador |
| **Hostinger** | e-mail (MX `mx1/mx2.hostinger.com`), SMTP `smtp.hostinger.com:465`, IMAP; hPanel (DNS, caixas) | só por credencial no servidor ou navegador |
| **Make** | **defasado**: fallback antigo do cadastro de newsletter/e-book | webhook chamado pela rota `/api/newsletter` |
| **Evolution API** | WhatsApp do estúdio (instância `mbf`), operado pelo Harbinger | servidor do OpenBot |
| **Mirror de arquivos** | download do e-book (`file.madebyfelipe.agency/api/shares/ebook/...`) | URL só sai na resposta da API após opt-in |
| **Magnific / Freepik** | fotos de banco licenciadas | conector MCP |
| **Google** (`alo@`) | Agenda, Drive | conectores MCP (Gmail **não** — caixa é Hostinger) |
| **Trello** | kanban de projetos por milestones (`milestones.md`) | conector MCP — conectar a conta do Felipe (a conectada hoje é outra) |
| **Meta Pixel** | conversão, **só com consentimento** | `components/CookieConsent.tsx` |
| **GitHub** | `madebyfelipe/lpfds` (público), este harness (privado) | MCP do GitHub |

## Twenty — o essencial

**Objetos usados:** `people` (o lead), `campanhas_prospeccao`, `notes` (diário da
operação), `tasks`, `opportunities` (pouco usado: 2 registros), `companies`.

**Person — campos custom relevantes:**
- Identidade: `crp`, `abordagem`, `anosDeFormada`, `atuacao` (PRESENCIAL/ONLINE/AMBOS),
  `instagram`, `siteUrl`, `nicho`, `consentimentoLgpd`.
- Origem: `origem` (E_BOOK, INDICACAO, NEWSLETTER, CONTATO_DO_SITE, WEBINAR, PROSPECCAO),
  `iniciativa` (WHATSAPP, EMAIL, INSTAGRAM, COLD_CALL, SITE_ORGANICO, INDICACAO,
  PROSPECCAO_GRINGA…), `utm*`, `lote`, `responsavel`.
- Diagnóstico (**legado**, 15/11): `indiceAtual`, `bandaAtual` — não preencher.
- Prospecção: `prospStatus` (PESQUISAR, REVISAR, PRONTO, ENVIADO, FOLLOWUP_ENVIADO,
  RESPONDEU, REUNIAO, DESCADASTRADO, BOUNCE, DESCARTADO, LISTA_FRIA, PREVIA_ENVIADA,
  ACEITE, GANHO, PERDIDO, PAUSA), `prospCampanha` (slug), `prospPrioridade` (A/B/C),
  `prospScore`, `prospFonte`, `prospEvidencia`, `prospHipotese`, `prospLimite`,
  `prospAssunto(B)`, `prospMensagem`, `prospFollowup/2/3`, `prospCaixa`,
  `prospVariante`, `prospEtapa`, `prospEnviadoEm`, `prospClassificacao`,
  `prospResposta`, `prospRespostaSugerida`, `optOut`, `motivoPerda`, `proximaAcao`,
  `ultimoContatoEm`. Legado: `prospCliques`, `prospUltimoCliqueEm` (rastreio descartado),
  status `PESQUISAR`/`REVISAR` (painel).

**Opportunity:** `stage` (RECEBIDA, EM_ANALISE, PROPOSTA, CLIENTE, NAO_AGORA; os estágios
de análise/diagnóstico e `indice`/`banda`/`gargalo` são legado), `nps`.

**Notas do Dylan/Harbinger** (as que valem): "E-mail D0 enviado (…)", "E-mail devolvido
(BOUNCE)", "Resposta recebida (…)", "Envio avulso…". As notas `Prospecção · …` e
`Cold call · …` eram do painel (legado); `Prospecção · PAUSADA` só mantém o cron antigo parado.

**Workflows:** `email_listing_hub` (entrega do e-book) e um de confirmação de newsletter;
escolhidos pelo `source` na rota `/api/newsletter`. Ver `docs/newsletter-twenty.md`.

## Regras para qualquer integração nova

- Credencial só em variável de ambiente (Vercel / ambiente do agente). Repo é público.
- Nunca mandar nome/e-mail de lead para tela de métrica, relatório público ou serviço externo
  sem necessidade.
- Formulário novo: aceite obrigatório validado no servidor; nunca mostrar "enviado" sem ter enviado.

## Complemento do OpenBot (íntegra em `openbot/infraestrutura.md`)

- **Servidor OpenBot:** Linux em UTC, sem Python e sem jq (scripts bash + curl), ~2,5 GB de
  RAM livre, IP de datacenter (Instagram bloqueia login; Vercel CLI barrada → usar API do
  GitHub e MCP da Vercel). Cofre de chaves do OpenBot guarda os segredos.
- **Evolution API:** `evo.madebyfelipe.agency`, instância `mbf`. Antes de enviar,
  `connectionState` tem de estar `open`. `PENDING` = aceito, não entregue.
- **Apify** (Google Maps, teto US$ 5/ciclo) · **Snov.io** (aquecimento da conta C) ·
  **cal.com/madebyfelipe/15min** · **Google Postmaster**: ainda não configurado.
- **MCP no OpenBot:** github, vercel, supabase, huggingface, onepagelove, computer_use.
  Trello pede login; Notion e Cloudflare falham.
