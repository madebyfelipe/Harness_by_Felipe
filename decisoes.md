# Decisões do Felipe (mais recente primeiro)

**Regra de recência:** quando dois arquivos discordam, vale a decisão **mais recente**
desta lista. Não travar por inconsistência: aplique a mais nova e corrija o arquivo antigo.
Decisão nova entra **no topo**, com data e motivo.

## 15/11/2026 — anotado pela Central

| decisão | o que muda |
|---|---|
| "refira-se a esse conteúdo quando for montar uma postagem" | **Toda postagem de Instagram consulta `instagram.md`** (pilares, voz, limites, CTA, calendário) antes de ser montada. Planejamento criado em 15/11/2026 |
| suba o sellbird na vps, versão github (reabre a decisão provisória de seguir só no harness próprio, porque agora há acesso) | **Aplicado na triagem de 15/11**: Sellbird em `/data/sellbird/app`, painel em `127.0.0.1:5555`; `consolidacao.md` e M2.5 corrigidos. Avaliação reaberta; casa das rotinas segue decisão do Felipe |
| Triagem semanal de feedback (15/11, 1ª rodada) | Nenhuma regra nova. "Não consigo ver a interação dos subagentes nem o background" (3x) virou cartão prioritário em Entrada (M3). Seis "bom" sem ação |

## 15/11/2026 (madrugada) — memória, crescimento e autonomia dos agentes

| decisão | o que muda |
|---|---|
| **Memória durável por agente** (estilo Hermes Agent) | `memoria/<agente>.md` entra no prompt de cada execução; ferramentas `lembrar`, `minha_memoria` e `esquecer`; regras em `memoria/README.md` |
| **Crescimento automático** | ao fim de execução com 6+ ferramentas ou erro, uma revisão Haiku grava até 3 lições (máx. 1 a cada 20 min por agente); curador semanal liga repetidas e promove lição procedural a `skills/<slug>/SKILL.md` |
| **Autonomia por agente** | `autonomia: assistido` (padrão), `livre` (o que o classificador já considera seguro roda sem cartão, registrado) e `consultivo` (só lê e responde). Hoje: `programador` e `qa-site` livres; `analista-mercado` consultivo |
| **Nada de segredo na memória** | filtro recusa texto com cara de chave/senha; segredo continua só no cofre |


## 15/11/2026 (madrugada) — M1 no ar e Fase 5 da Central

| decisão | o que muda |
|---|---|
| **Depoimentos fictícios fora do site** (execução da decisão de 15/11) | `lib/institucional.ts`, `lib/institucional-en.ts`, home PT/EN e `/lp/marca` sem a seção; componente `Depoimentos` apagado |
| **`/diagnostico` aposentado de vez** | Página, formulário, `/api/diagnostico` e `lib/diagnostico.ts` removidos; nenhum CTA restante |
| **Rastreio de clique fora do site** | `/r/[token]`, `/api/prospeccao/link-clique`, `lib/prospeccao/clique.ts` e `CLIQUE_SECRET` removidos; e-mail usa o link direto do exemplo. `prospCliques` fica só como histórico |
| **Crons de disparo e webinar fora do `vercel.json`** | Nada de disparo/webinar agendado pela Vercel |
| **Planejar é quem escolhe o modelo** | Planejar ligado: a triagem escolhe modelo e passos. Desligado: vale o modelo do seletor, inclusive nos passos do workflow. Modo Contexto mantém o modelo próprio |
| **Sellbird: decisão provisória pelo harness próprio** | Sem acesso ao Sellbird para conferir os critérios de `consolidacao.md`. Fica o harness (Central) para rotinas; revisar só se o Felipe trouxer o acesso |
| **Fase 5 da Central feita** | Fila única de aprovações (`/aprovacoes`) e tela de registros (`/registros`) com execuções, aprovações e auditoria |


## 15/11/2026 — uma porta só, voz e CLI

| decisão | o que muda |
|---|---|
| **Triagem sempre ligada**: abriu o chat, ela decide e executa; nada para trocar | Central sem seletor de modo/agente na tela principal (`triagem.md`) |
| **Voz primeiro**: o Felipe fala (áudio), descarrega ideia, a IA executa | Microfone e áudio do WhatsApp como entrada principal; a triagem separa tarefa, ideia, feedback e decisão |
| **Uso pessoal, não comercial** | Assinatura e ferramentas **pelo CLI**, na VPS; sem chave de API por padrão |
| **Consolidar tudo** no harness ou numa solução mínima: sem 30 abas, sem gerenciar provedora | `consolidacao.md`: inventário de rotinas e destino |
| **Sellbird em avaliação** (usa a assinatura de IA do Felipe) | Critérios de comparação em `consolidacao.md` |

## 15/11/2026 — envio automático e triagem automática

| decisão | o que muda |
|---|---|
| **Envio de e-mail de campanha é automático.** Campanha aprovada uma vez pelo Felipe (lista, oferta, texto-base) = rotina roda sozinha e **só reporta depois**. Motivo: "a lista é minha, a oferta é minha, o e-mail é meu; a IA só me ajuda a escrever, como no portal de e-mail" | Acaba a revisão humana por e-mail. D0, follow-ups e respostas previstas no playbook saem sem esperar o Felipe. Checagens automáticas (guardião, optOut, bounce, cotas) continuam, sem pessoa no meio. Fica com o Felipe só o que está fora do playbook (desconto, contrato, objeção estranha, denúncia) |
| **Pode assinar como Felipe** | O remetente (Felipe ou Leonardo) é definido por campanha |
| **Rotina é rotina**: executa sem interferência e checa depois | Vale para toda rotina do harness, não só e-mail |
| **Triagem automática ("auto mode")**: um Sonnet recebe a tarefa, levanta o que fazer, mede a complexidade e escolhe agente(s), modelo e workflow | Especificação em `triagem.md`; agente em `agents/triagem.md` |
| Coisa de passado distante: descartar ou marcar como defasada | Reforço da regra de recência |

## 15/11/2026 — limpeza de legado

| decisão | o que muda |
|---|---|
| **Prospecção e disparos rodam só no OpenBot** (Claude headless na VPS). A "prospecção noturna" agendada no Claude não existe mais | Rotina do Claude, painel `/painel/campanhas` e cron `/api/prospeccao/disparo` do site viram **legado**. Fonte única de prospecção: Quinn (captação) + Dylan (e-mail) no OpenBot |
| **Rastreio de clique descartado** | Link `/r/<token>`, campos `prospCliques`/`prospUltimoCliqueEm`, `CLIQUE_SECRET` e o painel de cliques saem do harness. Nenhum e-mail novo leva link rastreado. Motivo: confuso, painel ruim, sem resultado |
| **Diagnóstico gratuito descartado** (`/diagnostico`, Índice, bandas, gargalo) | Não ofertar, não citar, não usar como CTA. Motivo: não trouxe resultado |
| **Produtos ativos: e-book (grátis) e site (low ticket, R$ 599 / R$ 1.999)** | Tudo o mais (webinar, recém-formados, diagnóstico) fica fora. **Imersão** não foi citada como ativa: não ofertar até o Felipe confirmar |
| **Clientes externos fora do harness** | Portfólio (`/portfolio`, PrismaPay, Alves & Nabuco etc.) é vitrine profissional, **não fonte** de copy, prova ou argumento de venda. Rotinas e agentes de clientes externos ficam fora do harness |
| **Depoimentos atuais são fictícios** (gerados por IA na época) | Não usar em lugar nenhum. Substituir por avaliações reais do Google, **anônimas** (só o texto da avaliação) |
| **ClickUp descartado** | Não usar como fila nem fonte |
| **Trello = kanban de projetos por milestones** (conta separada) | Ver `milestones.md` |
| **Loop de feedback** faz parte do harness | Ver `feedback.md` |

## 14/11/2026

| decisão | o que muda |
|---|---|
| Preço do site: **R$ 599 (página única) / R$ 1.999 (institucional)**, até 12x, sem mensalidade | Vale sobre R$ 440 / R$ 1.540 (playbook do Dylan) e R$ 440 / R$ 1.550 (`beta` antiga) |
| Cotas de e-mail: conta C 7/janela e 40/dia; A e B 2/janela e 10/dia; máx. 60/dia; nada no fim de semana | Conta C ativada; CCO para o `alo@` |
| Apagar projeto, canal e agentes de game dev no OpenBot | 7 agentes ainda precisam ser excluídos na interface |

## 13/11/2026

- Produção do site = branch **`beta`** (merge na `beta` publica).
- Trava de parada por bounce desligada; só relatar.
- Não ampliar nem reescrever posts antigos do blog.
- Disparo do painel do site pausado (hoje legado, ver 15/11).

## 12/11/2026

- Campanha de e-mail v2 (Dylan): D0 curto sem preço, FU D+3 e D+7, teste A/B de assunto
  (vencedor só com 60+ envios por braço).
- Blog com artigos longos, 2 rodadas por dia, até 10 artigos.

## Antes de 12/11 (referência)

- WhatsApp e DM do Instagram de prospecção pausados; canal único é o e-mail.
- ICP: advogados (até ago/2026) → psicologia (ago) → recorte em neurodivergência (out).
  Não voltar atrás.
