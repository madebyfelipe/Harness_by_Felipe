# Rotinas — o que já roda e o que o harness deve rodar

_Horários em Brasília (America/Sao_Paulo). Levantado em 14/11/2026._

## 1. O que já roda sozinho

### Tarefas agendadas do Claude (conta)

| rotina | quando | status | o que faz |
|---|---|---|---|
| **[NOVO] Editorial — Tributário** | cron `0 5 * * *` (**todo dia** 05:00) | ✅ ativa | Repo `advocacia_an`: pesquisa notícias tributárias (7 dias, fontes oficiais, nota ≥7), artigo assinado pelo Dr. Milton + versão LinkedIn, capa com foto Magnific, `editorial check`, **auto-aprova e faz merge na main** (publica Blog + LinkedIn no perfil do Felipe) |
| **[NOVO] Editorial — Trabalhista** | cron `0 5 * * *` (**todo dia** 05:00) | ✅ ativa | Igual, trabalhista, assinado pela Dra. Francini |
| **Reset de tokens 11h** | 05:30 todo dia | ✅ ativa | Manda o Haiku dizer "Oi." — abre a janela de uso cedo para o limite resetar às 10:30, quando o Felipe volta ao trabalho intenso. ⚠️ As rotinas das 05:00 já abrem a janela antes (reset ~10:00) |
| Editorial — Tributário / Trabalhista (antigas) | 05:00 | ⏸ desativadas 13/11 | Versão que **pedia aprovação** antes do merge (substituídas pelas [NOVO]) |
| **Prospecção noturna** | 02:56 seg–sex | ⏸ desativada 11/11 | Segue `docs/prospeccao-rotina.md`: pauta do painel → respostas, reescritas, importados, pesquisa por campanha → grava como REVISAR. Não envia |
| black berry · turno da madrugada | 01:00 seg–sex | ⏸ desativada 14/10 | Implementa 1 issue por noite no SaaS, abre PR |
| black berry · revisão semanal | dom 01:00 | ⏸ desativada 14/10 | Arruma fila de issues, relatório de domingo |

> ⚠️ As duas [NOVO] chamam-se "terça" e "quinta", mas o cron é **diário** (rodaram no
> sábado 14/11). Ver `pendencias.md`.

### Crons da Vercel (site)

| rota | quando | o que faz |
|---|---|---|
| `/api/webinar/reminders` | 09:00 todo dia | lembretes do webinar |
| `/api/prospeccao/disparo` | 09:00, 11:00, 14:00 seg–sex | lê caixas (IMAP: respostas, descadastro, bounce), follow-ups vencidos, 1ºs e-mails com rampa, saúde das caixas. **Hoje pausado** pela nota no Twenty |

### Rotinas do OpenBot (complemento — íntegra em `openbot/rotinas.md`)

| rotina | agente | quando | status |
|---|---|---|---|
| E-mail E1 a E6 (ler respostas → follow-ups → D0 novos → CRM) | Dylan | seg–sex **05:30, 07:30, 09:30, 12:00, 14:00, 16:00** | ativa |
| E-mail E7: resumo do dia ao Harbinger (sem envio) | Dylan | seg–sex 19:30 | ativa |
| Reposição de leads (meta: 150 elegíveis na fila) | Quinn | sexta 10:00 | ativa |
| Blog lpfds, rodadas A e B (até 5 artigos cada) | Casey | diária **00:30 e 03:00** | ativa |
| Ampliar posts curtos | Casey | 05:30 | pausada |
| Arte de Instagram + SEO da A&N | Blake | diária 08:00 | ativa |
| Resumo semanal de artigos no grupo "Marketing \| Alves Nabuco" | Harbinger | sexta 17:00 | ativa |

Cotas de e-mail (decisão de 14/11), D0 + follow-ups: conta C `contato@dazzmarketing.com.br`
7 por janela / 40 por dia; contas A `leonardo@` e B `contato@madebyfelipe.agency` 2 por
janela / 10 por dia cada; **máximo 60/dia**; fim de semana e feriado, nada.

> Janela de uso: se o OpenBot usa o login da mesma assinatura, a rodada da Casey às 03:00
> já abre a janela antes do "reset" das 05:30.

### Rotinas do Felipe (agenda `alo@`)

- **Seg e qua, 10h** — entrega do carrossel semanal da Alves & Nabuco (arte, legenda, agendar).
- **Sex, 10h** — entrega do vídeo semanal da Alves & Nabuco (edição, legenda/thumb, agendar).
- Durante o dia: revisa e aprova PRs (blog, site), decide copy/oferta, responde leads.
  Trabalha muito **pelo celular** (sessões abertas no Android).
- Dia do Felipe começa cedo; o "reset de tokens" sugere uso pesado a partir das 11h.

### A rotina de e-mail como o Felipe desenhou

```
(contínuo)  pesquisador-leads: navegador no Google Maps → dados públicos → Twenty (API),
            com campo `iniciativa` (prospecção gringa · prospecção brasileira · cold call)
(contínuo)  enriquecedor: o que o negócio já tem, se o site está adequado, pontos de melhoria
(véspera)   redator: e-mail personalizado por contato (custom delivery, não bulk)
05:00       1º bloco de disparos
…           novos blocos em janelas ao longo do dia
            3–4 caixas Hostinger (SMTP) × ~20 e-mails por caixa  ≈ 60–80 por dia
            todas as caixas redirecionam para o Gmail pessoal do Felipe (respostas chegam lá)
```

Sugestão de janelas (ajuste fino é seu): **05:00 · 07:30 · 09:30 · 15:30**, ~5 e-mails por
caixa por janela, com 3–5 min entre envios da mesma caixa e um domínio por vez. Caixas
novas seguem a rampa (5/dia, +2 por dia útil) até o teto de ~20.

## 2. Rotinas propostas para o harness

Princípio: **rotina não envia nada a lead, não faz merge na `beta`, não muda oferta.**
Prepara, mede e pergunta. O que já é feito por um agente do OpenBot não se duplica.

### Diárias

| quando | rotina | entrega |
|---|---|---|
| **07:30 seg–sex** | **Briefing comercial** | Uma tela: respostas novas (por classificação), réplicas rascunhadas esperando envio, prévias de site pedidas e não entregues, follow-ups do dia, leads quentes (clique no `/r/`), compromissos da agenda. Termina com "as 3 coisas que só você pode fazer hoje" |
| 07:30 seg–sex | **Saúde do site** | `www` responde 200 nas rotas principais, último deploy de Produção é da `beta`, `/api/email-health` ok, formulários (imersão, LP, diagnóstico, newsletter) respondendo, drift `main` × `beta` (avisa se há commits da `main` fora do ar) |
| 18:00 seg–sex | **Fechamento de vendas** | O que saiu hoje (envios, respostas, bounces, descadastros) e o que ficou sem dono. Atualiza `proximaAcao` no Twenty |
| ao chegar PR do blog | **Revisor de post** | Checa art. 20, números da oferta, fonte normativa com link, FAQ, capa, CTA; comenta no PR o que reprovar (não faz merge) |

### Semanais

| quando | rotina | entrega |
|---|---|---|
| **Seg 08:00** | **Pipeline e cold mail** | Funil por campanha (aba E-mail), taxa de resposta/positiva/bounce por caixa e variante (vencedor só com 60+ por braço), leads parados há 7+ dias, sugestão de 1 ajuste de copy para o Felipe decidir |
| Seg 08:00 | **Oferta consistente** | Varre site (`main` e `beta`), LPs, banner do blog, JSON-LD, og, `/reembolso`, briefings das campanhas no Twenty e textos do Dylan atrás de número de oferta antigo (2 dias, 45 dias, R$ 440, R$ 1.550) |
| Qua 08:00 | **SEO** | Posições das palavras-chave do blog (precisa reconectar OpenSEO / Search Console), posts canibalizando, próximas pautas para a Casey |
| Sex 16:00 | **Manutenção técnica** | build, axe-core 0 violações, consentimento, links quebrados, imagens pesadas, deps com alerta de segurança; abre issue/PR com o que achar |
| Dom 20:00 | **Resumo da semana** | 5 linhas: vendas, site, conteúdo, riscos, decisões pendentes |

### Mensais

- **Higiene do CRM**: duplicados, leads sem campanha/origem, campos `prosp*` inconsistentes,
  pedidos LGPD de eliminação.
- **Entregabilidade**: DMARC (relatórios `rua`), SPF/DKIM das caixas, bounce por caixa.
- **Legal**: `ATUALIZADO_EM`, razão social/endereço, autorizações de depoimentos.
- **Portfólio**: case novo entregue? fotos em resolução melhor?

### Gatilhos (por evento, não por horário)

- **Lead respondeu** → classifica, rascunha réplica, avisa Felipe/Leonardo (push).
- **Lead pediu a prévia** → abre tarefa "montar rascunho de site" com o briefing pronto
  (site atual, Instagram, público, 3 seções sugeridas).
- **Form do site recebido** (imersão, LP, diagnóstico) → cria/atualiza Person e oportunidade,
  rascunha a 1ª mensagem de WhatsApp para o Felipe enviar.
- **Merge na `beta`** → confere deploy Production e roda a saúde do site.
- **Felipe mudou oferta/preço** → roda "Oferta consistente" na hora.
