# Vendas — funil, canais, CRM e playbook

_Números do Twenty em 14/11/2026, só agregados. Limpeza de legado em 15/11/2026: prospecção
só no OpenBot, sem rastreio de clique, sem diagnóstico (ver `decisoes.md`)._

## Onde a prospecção roda (15/11/2026)

**Só no OpenBot**, na VPS, com o Claude rodando headless. Não existe mais rotina de
prospecção agendada no Claude, e o painel do site (`/painel/campanhas` + cron de disparo)
é **legado**: não retomar, não usar como fonte de status.

| etapa | quem (OpenBot) | como |
|---|---|---|
| Captação | **Quinn** (sexta 10:00) | Google Maps via Apify (teto US$ 5/ciclo) + link da bio + busca → Twenty, campo `iniciativa` |
| Enriquecimento | Quinn/Dylan | o que já existe no perfil, se tem site, gancho específico |
| E-mail personalizado + disparo | **Dylan** (seg–sex 05:30, 07:30, 09:30, 12:00, 14:00, 16:00) | "custom delivery, não bulk", em blocos por caixa |
| Resumo do dia | Dylan → Harbinger (19:30) | enviados, respostas, bounces, fila, o que precisa do Felipe |
| Prévia do site de quem aceita | **Tyler** | rascunho de 1 página em link privado |

Antes de abrir uma iniciativa nova: `skills/pesquisa-de-preco` + `skills/validacao-de-oferta`.
Íntegra do cold mail: `openbot/vendas-cold-mail.md` (snapshot de 14/11; preço lá está
desatualizado).

## Caixas e cotas

- A `leonardo@madebyfelipe.com.br`, B `contato@madebyfelipe.agency`, C
  `contato@dazzmarketing.com.br` (aquecimento pelo Snov.io; assunto com "[WRM]" é
  aquecimento). Todas com CCO para o `alo@`.
- Cotas (14/11), D0 + follow-ups: C 7/janela e 40/dia; A e B 2/janela e 10/dia cada;
  **máx. 60/dia**; fim de semana e feriado, nada.
- Respostas: as caixas redirecionam para o Gmail pessoal do Felipe e o Dylan lê por IMAP.
  Fonte única de "respondeu" ainda a definir (ver `pendencias.md`).
- Risco: o `alo@` é o domínio do site e do e-book. Prospecção não sai por ele.

## Cold mail (campanha v2, 12/11)

- **Quem pode receber:** `PRONTO`/`LISTA_FRIA` da campanha `site-gratis-whatsapp`,
  prioridade A/B, evidência "sem site", sem `optOut`, `responsavel` ≠ FELIPE. Só psicologia.
- **D0:** 70–90 palavras, sem preço, texto puro, **sem link**, uma pergunta ("Posso fazer o
  seu?"). Assunto A1 "site para o seu consultório" / A2 "rascunho de site, sem custo".
- **FU1** D+3, **FU2** D+7, depois PERDIDO "sem resposta após 3 e-mails".
- Assina **Leonardo**, cita o perfil (site/Instagram), oferece "um rascunho de uma página,
  sem custo, só pra vocês verem como ficaria", rodapé "Se não for o momento, é só me avisar
  que eu não escrevo mais".
- **Sem link rastreado** (descartado em 15/11). Se precisar mostrar exemplo, link simples.
- **Pergunta de preço:** **R$ 599 (página única) / R$ 1.999 (institucional), até 12x, sem
  mensalidade** (decisão de 14/11). O `EMAIL-PLAYBOOK.md` do Dylan ainda diz R$ 440 / R$ 1.540
  e proíbe parcelamento — vale o preço novo.
- **Interesse:** pede nome como assina, CRP e modalidade → `RESPONDEU`, `responsavel FELIPE`.
- **Envio automático** (15/11): campanha aprovada roda sem revisão por e-mail. O Felipe
  aprova a campanha uma vez (lista, oferta, texto-base) e recebe o resumo do dia (E7, 19:30).
- **Fila:** e-mail gratuito só com nome/@ batendo, no máximo 6 por conta/dia.
- **Números:** 11/11 18 D0 (2 bounces) · 12/11 13 D0 · 13/11 12–13 D0, 1 bounce, 1 resposta
  com interesse. Meta: reuniões até **30/11/2026**.

## O funil hoje

```
Quinn (captação) ─► Lista fria ─► Dylan: D0 ─► FU1 ─► FU2 ─► PERDIDO
                                      │
                               resposta │
                                      ▼
                      Felipe/Leonardo respondem ─► Tyler monta a prévia (rascunho grátis)
                                                        │
                                       site R$ 599 / R$ 1.999 ─► GANHO / PERDIDO
```

Status no Twenty (`people.prospStatus`): LISTA_FRIA → PRONTO → ENVIADO → FOLLOWUP_ENVIADO →
RESPONDEU → REUNIAO → PREVIA_ENVIADA → ACEITE → GANHO. Saídas: PERDIDO, DESCARTADO, PAUSA,
DESCADASTRADO, BOUNCE. `PESQUISAR`/`REVISAR` eram do painel (legado).

## Campanhas

| slug | status | leads | situação |
|---|---|---|---|
| `site-gratis-whatsapp` | **ativa** (Dylan; sem objeto de campanha no Twenty) | 706 | 622 lista fria · 69 enviados · 2 responderam · **1 ganho** · 7 perdidos · 4 bounce |
| `prospeccao-gringa` | PAUSADA, oferta/tom **a definir** | 310 | lista fria (só nome e cidade) |
| `site-fraco-local` | PAUSADA, oferta/tom **a definir** | 154 | lista fria (Sorocaba/Votorantim) |
| `psico-neurodivergencia` | **legado** (era do painel) | 248 | 40 PRONTO parados; decidir se passam para o Dylan |

Oportunidades no Twenty: só **2** — o funil vive no objeto **Person**.
**Vencedor de variante só com 60+ envios por braço.**

## Canais de entrada (inbound)

| canal | onde | vai para |
|---|---|---|
| Quiz da LP do site (A–D → Nome + WhatsApp) | `/lp/site` (noindex, tráfego pago) | `/api/lp-lead` → e-mail "Novo lead" |
| E-book / newsletter | `/hub` (modal) | Twenty (workflow `email_listing_hub`); Make é fallback antigo |
| WhatsApp direto | todos os CTAs | `wa.me/5515992835226` |
| Blog (SEO) | 75+ posts | CTA "Conversar por 15 minutos" + banner do site |
| Comentários do blog | posts | e-mail de moderação |

Legado (não usar como canal ativo): `/diagnostico`, `/webinar`, `/imersao`, `/lp/marca`.

## Regras de copy

**1º e-mail:** até 100 palavras · abre com **uma linha específica** do site/Instagram dela ·
**uma pergunta só** · **nenhum pedido de reunião** ("15 min", "call", "agendar") · sem
link, anexo, emoji · tom de colega, 1ª pessoa.

**Assunto:** até 7 palavras, minúsculas, sem `!`, emoji, `Re:`/`Fwd:` falso.

**Follow-ups:** até 70 palavras, cada um com **ângulo novo**; o último é despedida. Nunca
"só passando para lembrar".

Afrouxar qualquer regra é **decisão do Felipe**. Regras completas de voz:
`skills/email-personalizado/SKILL.md`.

## Playbook de resposta (automático dentro do playbook)

Resposta que cai numa linha abaixo é enviada pela rotina, sem esperar o Felipe, e entra no
resumo do dia. O que não cabe aqui vai para o Felipe.

| classificação | o que fazer |
|---|---|
| `INTERESSADA` | até 90 palavras, responde o que ela disse, oferece a prévia ou conversa curta (`cal.com/madebyfelipe/15min`) |
| `PERGUNTA` | responde em poucas linhas e devolve uma pergunta |
| `NAO_AGORA` | agradece e pergunta se pode voltar em alguns meses |
| `SEM_INTERESSE` | não responde; marca e encerra |
| `INDICOU_OUTRA` | agradece; novo lead com a indicação como fonte |
| "não", "não quero", "sair" | descadastro imediato, para sempre |

Desconto, nota fiscal, contrato, objeção fora do roteiro: vai para o Felipe.

## O que a IA pode e não pode fazer em vendas

| pode (sozinha, reporta depois) | não pode |
|---|---|
| pesquisar leads só com e-mail/telefone **publicado** pela profissional, anotando a URL | adivinhar e-mail, usar base comprada, `noreply@`/`financeiro@` |
| escrever e **enviar** 1º e-mail e follow-ups de campanha aprovada | abrir campanha nova ou mudar oferta/lista sem o Felipe |
| classificar respostas e **responder** pelo playbook | negociar desconto, contrato, nota fiscal; responder objeção fora do roteiro |
| | retomar disparo pausado, mudar regra de copy, prometer prazo/garantia, conectar no LinkedIn |
| deduplicar contra o CRM inteiro antes de gravar | transformar contato de outra origem (newsletter, cliente) em prospecção fria |
| | usar depoimento fictício ou cliente do portfólio como prova |

Envio avulso (fora de campanha) só com pedido do Felipe e registrado em nota no Twenty.

## Métricas que importam

- **Resposta** (não há pixel de abertura nem rastreio de clique). Positiva, SAIR, bounce.
- Definições = as do relatório diário do Dylan (`benchmark.js` no OpenBot).
- Metas de referência (a validar): bounce < 2%, SAIR < 3%, resposta ≥ 3%, positivas ≥ 1%.
- Relatório mostra **só números** — nunca nome, e-mail ou id de lead.

## Peças de venda

- `/lp/site` (preços) e `/exemplo/site-psicologa` (página fictícia, noindex).
- Assinaturas de e-mail animadas em `/painel/identidade` (Felipe e Leonardo).
- `analise-cro-benchmark-v4` (skill do Felipe): deck de CRO + benchmark, para venda consultiva.
- Prova social: só avaliações reais do Google, anônimas (pendente coletar — ver `pendencias.md`).
- `Modelo_Proposta_Comercial.pdf` é da época da imersão: **legado**.
