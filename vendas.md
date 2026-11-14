# Vendas — funil, canais, CRM e playbook

_Números do Twenty em 14/11/2026, só agregados._

## Como o Felipe opera a prospecção (nas palavras dele)

1. **Captação por scraping**: um bot abre o navegador, pesquisa negócios no **Google Maps**
   e sobe as informações no **Twenty** (`crm.madebyfelipe.agency`) pela API.
2. **Separação por iniciativa**: cada contato tem o campo `iniciativa` — prospecção
   gringa, prospecção brasileira, cold call.
3. **Enriquecimento**: o bot faz um levantamento leve do negócio — o que já existe no
   site, se está adequado, pontos de melhoria.
4. **E-mail personalizado** para cada contato — "não é bulk mail, é custom delivery".
5. **Disparo em blocos** a partir das 05:00, em janelas ao longo do dia, por **3–4 caixas
   Hostinger** (SMTP), **~20 e-mails por caixa**. Caixas hoje: A `leonardo@madebyfelipe.com.br`, B `contato@madebyfelipe.agency`,
   C `contato@dazzmarketing.com.br` (em aquecimento pelo Snov.io; assunto com "[WRM]" é
   aquecimento), todas com CCO para o `alo@`.
6. **Respostas**: todas as caixas redirecionam para o Gmail pessoal do Felipe.
7. **Antes de abrir uma iniciativa**: pesquisa de preço do mercado local (ex.: por estado,
   na campanha dos EUA, para achar uma média e ser um pouco mais competitivo) +
   **validação da oferta** contra a oferta principal. Skills em `skills/`.

> Como as respostas chegam no Gmail pessoal (e não só no IMAP das caixas), o painel e os
> bots podem não ver uma resposta que o Felipe já leu. Vale decidir uma fonte única de
> "lead respondeu" (ver `pendencias.md`).

## Complemento do OpenBot (íntegra em `openbot/vendas-cold-mail.md`)

- **Canal ativo: só e-mail.** WhatsApp e DM do Instagram de prospecção estão pausados.
- **Quem pode receber:** `PRONTO`/`LISTA_FRIA` da campanha `site-gratis-whatsapp`,
  prioridade A/B, evidência "sem site", sem `optOut`, `responsavel` ≠ FELIPE. Só psicologia.
- **Sequência v2 (12/11):** D0 70–90 palavras sem preço, uma pergunta ("Posso fazer o
  seu?"), assunto A1 "site para o seu consultório" / A2 "rascunho de site, sem custo";
  FU1 D+3, FU2 D+7, depois PERDIDO "sem resposta após 3 e-mails".
- **Pergunta de preço:** texto fechado do playbook. ⚠️ O playbook diz **R$ 440 / R$ 1.540**;
  o site novo (na `main`) diz **R$ 599 / R$ 1.999 em até 12x**, e o playbook proíbe falar
  de parcelamento. **Decisão do Felipe (14/11): vale R$ 599 / R$ 1.999, até 12x.** O playbook do Dylan precisa ser atualizado.
- **Interesse:** pede nome como assina, CRP e modalidade → `RESPONDEU`, `responsavel FELIPE`.
- **Fila:** e-mail gratuito só com nome/@ batendo e no máximo 6 por conta/dia. Em 13/11 só
  18 elegíveis, todos gratuitos → fila acaba em poucos dias sem a Quinn repor.
- **Captação:** Apify com teto de US$ 5 por ciclo (US$ 4,87 gastos em 13/11).
- **Números:** 11/11 18 D0 (2 bounces) · 12/11 13 D0 · 13/11 12–13 D0, 1 bounce, 1 resposta
  com interesse. Meta: reuniões até **30/11/2026**.
- **Agenda:** `cal.com/madebyfelipe/15min`.

## O funil hoje

```
Pesquisa (rotina/agente) ─► Lista fria ─► Revisão humana ─► 1º contato ─► Follow-ups
        │                                                     │
        │                                    resposta ◄───────┘
        ▼                                        │
   descarte / bloqueio                 Felipe/Leonardo respondem
                                                 │
                     ┌──────────── prévia grátis do site (rascunho) ◄── campanha "site grátis"
                     ▼
               conversa de 15 min ─► proposta ─► GANHO / PERDIDO
```

Duas esteiras convivem no mesmo CRM:

| esteira | quem opera | status usados no Twenty |
|---|---|---|
| **Painel do site** (`/painel/campanhas`) — e-mail frio + rotina noturna | Rotina do Claude + Felipe | PESQUISAR → REVISAR → PRONTO → ENVIADO → FOLLOWUP_ENVIADO → RESPONDEU → REUNIAO (+ DESCADASTRADO, BOUNCE, DESCARTADO) |
| **Cold mail do Dylan (OpenBot)** — "rascunho de site, sem custo" | Dylan envia como Leonardo; Harbinger no WhatsApp | LISTA_FRIA → ENVIADO → PREVIA_ENVIADA → ACEITE → GANHO / PERDIDO / PAUSA |

**Estado em 13/11:** o disparo do painel está **pausado** (nota "Prospecção · PAUSADA",
pedido do Felipe via Tyler: "Pausar o do site", fica só o cold mail do Dylan). **Não
retomar sem o Felipe.** A rotina noturna de prospecção também está desativada desde 11/11.

## Campanhas

| slug | status | leads | situação |
|---|---|---|---|
| `site-gratis-whatsapp` | ativa (Dylan, sem objeto de campanha no Twenty) | 706 | 622 lista fria · 69 enviados · 2 responderam · **1 ganho** · 7 perdidos · 4 bounce |
| `psico-neurodivergencia` | **ATIVA** no painel (disparo pausado) | 248 | 175 lista fria · 40 prontos · 2 em revisão · 23 enviados · 6 com follow-up · 2 bounce |
| `prospeccao-gringa` | PAUSADA, oferta/tom **a definir** | 310 | 306 lista fria (lista colada pelo Felipe em 14/11: só nome e cidade) |
| `site-fraco-local` | PAUSADA, oferta/tom **a definir** | 154 | lista fria (Sorocaba/Votorantim, sinais automáticos de site fraco) |
| `abordagem-antiga-06-11` | encerrada | 21 | 8 em pausa · 7 follow-up · 4 perdidos |

Outros: 6 contatos de **webinar**, 33–39 sem origem/campanha. Oportunidades no Twenty: só
**2** (1 RECEBIDA, 1 CLIENTE) — o funil vive no objeto **Person**, não em Opportunity.

Envios registrados por canal/caixa: WhatsApp Business do Felipe 47 · `leonardo@` 13 ·
`contato@madebyfelipe.agency` 12 · `alo@` 7 · sem caixa 20. Variantes: A1/A2 (Dylan),
A/B (painel). **Vencedor de variante só com 60+ envios por braço.**

## Canais de entrada (inbound)

| canal | onde | vai para |
|---|---|---|
| Form da imersão (Nome · CRP · WhatsApp) | `/imersao` | e-mail SMTP para `alo@` (+ CCO) |
| Quiz das LPs (A–D → Nome + WhatsApp) | `/lp/marca`, `/lp/site` (noindex, só tráfego pago) | `/api/lp-lead` → e-mail "Novo lead" |
| Diagnóstico | `/diagnostico` | Twenty (Person + Note + Task) + e-mail |
| E-book / newsletter | `/hub` (modal) | Twenty (workflow `email_listing_hub`) + Make |
| Webinar | `/webinar` | Twenty (webhook) + lembretes diários |
| WhatsApp direto | todos os CTAs | `wa.me/5515992835226` |
| Comentários do blog | posts | e-mail de moderação (nada é publicado sozinho) |
| Blog (SEO) | 75 posts | CTA "Conversar por 15 minutos" + banner do estúdio |

## Regras de copy (o servidor recusa o que fugir — `checarCopy`)

**1º e-mail:** até 100 palavras · abre com **uma linha específica** do site/Instagram dela ·
**uma pergunta só**, sobre como ela faz algo hoje · **nenhum pedido de reunião** ("15 min",
"call", "agendar", "bater um papo") · sem link, anexo, emoji · tom de colega, 1ª pessoa ·
sem assinatura (o servidor põe assinatura, "vi seu e-mail em {fonte}" e descadastro).

**Assunto:** até 7 palavras, minúsculas, sem `!`, emoji, `Re:`/`Fwd:` falso. Assunto B em
metade dos leads.

**Follow-ups:** até 3, até 70 palavras, +3/+4/+5 dias úteis, cada um com **ângulo novo**;
o 3º é despedida ("vou parar por aqui…"). Nunca "só passando para lembrar".

**Cold mail do Dylan (site grátis):** assina **Leonardo**, cita o perfil (site/Instagram),
oferece "um rascunho de uma página, sem custo, só pra vocês verem como ficaria", pergunta
"Posso preparar?", rodapé "Se não for o momento, é só me avisar que eu não escrevo mais".
Follow-ups D+3 e D+7. Link rastreado `/r/<token>` → `/exemplo/site-psicologa` (única
exceção à regra "sem rastreio", decisão do Felipe).

Afrouxar qualquer regra é **decisão do Felipe**, não ajuste de código.

## Playbook de resposta (rascunho; quem envia é humano)

| classificação | o que fazer |
|---|---|
| `INTERESSADA` | até 90 palavras, responde o que ela disse, propõe conversa curta (pode citar 2 horários / `PROSPECCAO_LINK_AGENDA`) |
| `PERGUNTA` | responde em poucas linhas e devolve uma pergunta |
| `NAO_AGORA` | agradece e pergunta se pode voltar em alguns meses |
| `SEM_INTERESSE` | não responde; marca e encerra |
| `INDICOU_OUTRA` | agradece; novo lead com a indicação como fonte |
| "não", "não quero", "sair" | descadastro imediato (automático por regra) |

Para cold call (Leonardo): roteiro abertura → descoberta → hipótese → próximo passo →
objeções; o gancho é uma observação concreta "que possa ser dita em voz alta".

## O que a IA pode e não pode fazer em vendas

| pode | não pode |
|---|---|
| pesquisar leads na web aberta, só com e-mail/telefone **publicado** pela profissional, anotando a URL | adivinhar e-mail, usar base comprada, Doctoralia sem e-mail, `noreply@`/`financeiro@` |
| escrever 1º e-mail, follow-ups, nota de LinkedIn, roteiro de ligação | enviar e-mail de prospecção fora do disparo, enviar réplica a lead, conectar no LinkedIn |
| classificar respostas e rascunhar réplica | retomar disparo pausado, mudar regra de copy, prometer prazo/garantia |
| deduplicar contra o CRM inteiro antes de gravar | transformar contato de outra origem (webinar, newsletter, cliente) em prospecção fria |
| registrar execução no painel | apagar quem se descadastrou |

Envio avulso (fora de campanha) acontece, mas **sempre aprovado pelo Felipe** e registrado
em nota no Twenty (ex.: e-mail do Leonardo + WhatsApp pelo Harbinger em 14/11).

## Métricas que importam

- **Resposta** (não abertura — não há pixel). Positiva, SAIR, bounce (caixa com bounce
  > 5% em 20+ envios sai do pool sozinha).
- Definições de enviado/bounce/resposta/positiva/SAIR = as do relatório diário do Dylan
  (`/data/OpenBot/Shared/campanha-email/benchmark.js`) e da aba "E-mail" do painel
  (`lib/prospeccao/email-metricas.ts`). Mudar uma é mudar as duas.
- Aba "E-mail" do painel mostra **só números** — nunca nome, e-mail ou id de lead.

## Caixas e entregabilidade

- Prospecção: `contato@dazzmarketing.com.br` (C), `leonardo@madebyfelipe.com.br` (A),
  `contato@madebyfelipe.agency` (B); `alo@` recebe CCO (`felipe@madebyfelipe.agency` previsto). Domínio `.agency`
  tem MX, SPF, DKIM, DMARC com relatório.
- Risco conhecido: o `alo@` é o mesmo domínio do site, da imersão e do e-book. Uma onda de
  denúncias de spam nele derruba tudo junto. Se for mantido no pool, ficar no teto mais
  baixo e monitorar bounce/denúncia de perto.
- Rampa: 5/dia → +2 por dia útil → teto 30 por caixa. Lead fica preso à caixa do 1º e-mail.
- Cron de disparo: 9h, 11h, 14h (seg–sex). Antes de enviar, lê todas as caixas por IMAP.
- Pendência antiga: DMARC do `madebyfelipe.com.br` sem `rua`.

## Peças de venda prontas

- `Modelo_Proposta_Comercial.pdf` (deck-fonte; a copy do site **não** é a B2B dele).
- LPs `/lp/marca` (imersão, sem preço) e `/lp/site` (preços, sites reais do portfólio).
- `/exemplo/site-psicologa` (página fictícia, noindex, destino do link rastreado).
- `/cases` (site entregue + processo criativo; exemplo fictício rotulado).
- Assinaturas de e-mail animadas em `/painel/identidade` (Felipe e Leonardo).
- `analise-cro-benchmark-v4` (skill sua): deck de diagnóstico CRO + benchmark de concorrentes.
