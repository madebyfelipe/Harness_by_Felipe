# Decisões do Felipe (mais recente primeiro)

**Regra de recência:** quando dois arquivos discordam, vale a decisão **mais recente**
desta lista. Não travar por inconsistência: aplique a mais nova e corrija o arquivo antigo.
Decisão nova entra **no topo**, com data e motivo.

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
