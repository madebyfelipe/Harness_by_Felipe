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
| **Make** | automação antiga: fallback do cadastro de newsletter/e-book | webhook chamado pela rota `/api/newsletter` |
| **Evolution API** | WhatsApp do estúdio (instância `mbf`), operado pelo Harbinger | servidor do OpenBot |
| **Mirror de arquivos** | download do e-book (`file.madebyfelipe.agency/api/shares/ebook/...`) | URL só sai na resposta da API após opt-in |
| **Magnific / Freepik** | fotos de banco licenciadas | conector MCP |
| **Google** (`alo@`) | Agenda, Drive | conectores MCP (Gmail **não** — caixa é Hostinger) |
| **ClickUp** | tarefas (Comercial / Operacional) | conector MCP |
| **Meta Pixel** | conversão, **só com consentimento** | `components/CookieConsent.tsx` |
| **Anthropic API** | IA opcional do painel (reescrever, ler resposta) | `ANTHROPIC_API_KEY` (testada só sem chave) |
| **GitHub** | `madebyfelipe/lpfds` (público), `advocacia_an`, `blackberry-dashboard` | MCP do GitHub; Actions: `cold-call-preflight.yml` (manual) |

## Twenty — o essencial

**Objetos usados:** `people` (o lead), `campanhas_prospeccao`, `notes` (diário da
operação), `tasks`, `opportunities` (pouco usado: 2 registros), `companies`.

**Person — campos custom relevantes:**
- Identidade: `crp`, `abordagem`, `anosDeFormada`, `atuacao` (PRESENCIAL/ONLINE/AMBOS),
  `instagram`, `siteUrl`, `nicho`, `consentimentoLgpd`.
- Origem: `origem` (E_BOOK, INDICACAO, NEWSLETTER, CONTATO_DO_SITE, WEBINAR, PROSPECCAO),
  `iniciativa` (WHATSAPP, EMAIL, INSTAGRAM, COLD_CALL, SITE_ORGANICO, INDICACAO,
  PROSPECCAO_GRINGA…), `utm*`, `lote`, `responsavel`.
- Diagnóstico: `indiceAtual`, `bandaAtual` (PONTO_DE_PARTIDA, EM_CONSTRUCAO, TERRITORIO).
- Prospecção: `prospStatus` (PESQUISAR, REVISAR, PRONTO, ENVIADO, FOLLOWUP_ENVIADO,
  RESPONDEU, REUNIAO, DESCADASTRADO, BOUNCE, DESCARTADO, LISTA_FRIA, PREVIA_ENVIADA,
  ACEITE, GANHO, PERDIDO, PAUSA), `prospCampanha` (slug), `prospPrioridade` (A/B/C),
  `prospScore`, `prospFonte`, `prospEvidencia`, `prospHipotese`, `prospLimite`,
  `prospAssunto(B)`, `prospMensagem`, `prospFollowup/2/3`, `prospCaixa`,
  `prospVariante`, `prospEtapa`, `prospEnviadoEm`, `prospClassificacao`,
  `prospResposta`, `prospRespostaSugerida`, `prospCliques`, `prospUltimoCliqueEm`,
  `optOut`, `motivoPerda`, `proximaAcao`, `ultimoContatoEm`.

**Opportunity:** `stage` (RECEBIDA, EM_ANALISE, ANALISE_ENVIADA, DIAGNOSTICO_AGENDADO,
PROPOSTA, CLIENTE, NAO_AGORA), `indice`, `banda`, `gargalo`, `nps`.

**Notas com título fixo (o painel lê):** `Prospecção · PAUSADA`, `Prospecção · caixa
pausada · <email>`, `Prospecção · bloqueios`, `Prospecção · execução · …`,
`Cold call · …` (envelope JSON v1). Dylan/Harbinger: "E-mail D0 enviado (…)",
"E-mail devolvido (BOUNCE)", "Resposta recebida (…)", "Envio avulso…".

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
