# Rotinas — o que já roda e o que o harness deve rodar

_Horários em Brasília (America/Sao_Paulo). Levantado em 14/11/2026, limpo em 15/11/2026._

## 1. O que já roda sozinho

### OpenBot (VPS, Claude headless) — onde roda a prospecção

Íntegra em `openbot/rotinas.md`.

| rotina | agente | quando | status |
|---|---|---|---|
| E-mail E1 a E6 (ler respostas → follow-ups → D0 novos → CRM) | Dylan | seg–sex **05:30, 07:30, 09:30, 12:00, 14:00, 16:00** | ativa |
| E-mail E7: resumo do dia ao Harbinger (sem envio) | Dylan | seg–sex 19:30 | ativa |
| Reposição de leads (meta: 150 elegíveis na fila) | Quinn | sexta 10:00 | ativa |
| Blog lpfds, rodadas A e B (até 5 artigos cada) | Casey | diária **00:30 e 03:00** | ativa |
| Ampliar posts curtos | Casey | 05:30 | pausada (não ampliar posts antigos, 13/11) |

Cotas de e-mail (14/11): C 7/janela e 40/dia; A e B 2/janela e 10/dia; **máx. 60/dia**;
fim de semana e feriado, nada.

Rotinas de clientes externos também rodam no OpenBot e em tarefas agendadas do Claude, mas
**ficam fora do harness** (ver `contexto.md`). Só importam aqui porque consomem a mesma
janela de uso.

### Tarefas agendadas do Claude (conta)

| rotina | quando | status |
|---|---|---|
| **Reset de tokens** | 05:30 todo dia | ativa — o Haiku diz "Oi." para abrir a janela cedo e o limite resetar perto das 10:30 |

Legado (não recriar): **prospecção noturna** (substituída pelo OpenBot em 15/11) e as
rotinas do black berry (desativadas desde out/2026).

### Crons da Vercel (site)

| rota | situação |
|---|---|
| `/api/prospeccao/disparo` (9h, 11h, 14h seg–sex) | **legado**, pausado por nota no Twenty. Prospecção é do OpenBot. Candidato a remover do `vercel.json` |
| `/api/webinar/reminders` (9h) | **legado** (webinar fora da oferta ativa) |

### Rotinas do Felipe

- Durante o dia: revisa PRs (blog, site), decide copy/oferta, responde leads. Trabalha
  muito **pelo celular**.
- Uso pesado a partir das ~10:30 (depois do reset). Madrugada e começo da manhã são dos
  agentes.

## 2. Rotinas propostas para o harness

Princípio: **rotina não envia nada a lead, não faz merge na `beta` sem pedido, não muda
oferta.** Prepara, mede e pergunta. O que o OpenBot já faz não se duplica.

### Diárias

| quando | rotina | entrega |
|---|---|---|
| **07:30 seg–sex** | **Briefing comercial** | respostas novas (por classificação), réplicas esperando envio, prévias de site pedidas e não entregues, follow-ups do dia, compromissos da agenda. Termina com "as 3 coisas que só você pode fazer hoje" |
| 07:30 seg–sex | **Saúde do site** | rotas principais em 200, último deploy de Produção é da `beta`, `/api/email-health` ok, formulários ativos (LP do site, newsletter) respondendo, drift `main` × `beta` |
| ao chegar PR do blog | **Revisor de post** | art. 20, preço do site, fonte normativa com link, FAQ, capa, CTA; nada de depoimento ou cliente do portfólio; comenta no PR o que reprovar |

### Semanais

| quando | rotina | entrega |
|---|---|---|
| **Seg 08:00** | **Pipeline e cold mail** | funil da campanha ativa, resposta/positiva/bounce por caixa e variante (vencedor só com 60+ por braço), leads parados há 7+ dias, 1 sugestão de ajuste de copy |
| Seg 08:00 | **Oferta consistente** | varre site (`main` e `beta`), LP, banner do blog, JSON-LD, og, playbook do Dylan atrás de número antigo (R$ 440, R$ 1.540, R$ 1.550), depoimento fictício, diagnóstico, link rastreado |
| Seg 08:30 | **Status dos milestones** | lê o quadro do projeto no Trello (`milestones.md`): em que milestone está, o que travou, o que falta para virar |
| Qua 08:00 | **SEO** | posições do blog (precisa OpenSEO / Search Console), canibalização, próximas pautas para a Casey |
| Sex 16:00 | **Manutenção técnica** | build, axe-core 0 violações, consentimento, links quebrados, imagens pesadas, deps com alerta |
| **Dom 20:00** | **Resumo da semana + triagem de feedback** | 5 linhas (vendas, site, conteúdo, riscos, decisões pendentes) + triagem de `feedback.md` |

### Mensais

- **Higiene do CRM**: duplicados, leads sem campanha/origem, pedidos LGPD de eliminação.
- **Entregabilidade**: DMARC, SPF/DKIM das caixas, bounce por caixa.
- **Legal**: `ATUALIZADO_EM`, razão social/endereço.

### Gatilhos (por evento)

- **Lead respondeu** → classifica, rascunha réplica, avisa Felipe/Leonardo.
- **Lead pediu a prévia** → tarefa "montar rascunho de site" com briefing pronto (perfil,
  público, 3 seções sugeridas).
- **Form do site recebido** (LP do site) → cria/atualiza Person, rascunha a 1ª mensagem de
  WhatsApp para o Felipe enviar.
- **Merge na `beta`** → confere deploy Production e roda a saúde do site.
- **Felipe mudou oferta/preço** → roda "Oferta consistente" na hora e registra em `decisoes.md`.
- **Felipe mandou `fb:`** → registra em `feedback.md` (ver arquivo).
