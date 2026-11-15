# Harness — Made by Felipe (vendas + manutenção do site)

Contexto coletado em **14/11/2026** e limpo de legado em **15/11/2026**, base de um harness
de agentes focado em **vendas** e **manutenção do site** `www.madebyfelipe.com.br`.

## Regra nº 1: o mais recente vale

O Felipe muda de ideia no meio do processo e um arquivo antigo fica para trás. Em conflito,
vale a decisão **mais recente** de [`decisoes.md`](decisoes.md). Não travar nem perguntar
por inconsistência: aplicar a mais nova e corrigir o arquivo antigo. Coisa antiga sem
decisão recente é **legado**: tirar, ou marcar como legado (pode estar defasado).

## Em 15/11/2026, o essencial

- **Produtos ativos:** e-book (grátis) e site (R$ 599 / R$ 1.999, até 12x). Imersão,
  diagnóstico, webinar: não ofertar.
- **Prospecção e disparos:** só no OpenBot (Claude headless na VPS). Painel do site e
  prospecção noturna do Claude são legado.
- **Sem rastreio de clique.** **Sem depoimentos** (os atuais são fictícios); prova social só
  com avaliação real do Google, anônima.
- **Clientes externos e portfólio fora** de venda, copy e rotinas.
- **Projetos por milestones** no Trello; **loop de feedback** do Felipe.
- **Envio de campanha é automático**: aprovou a campanha uma vez, a rotina roda e reporta
  depois. Pode assinar como Felipe. Ninguém revisa e-mail por e-mail.
- **Triagem automática**: um Sonnet recebe a tarefa e decide agente, modelo e workflow.

## Arquivos

| arquivo | para que serve |
|---|---|
| [`decisoes.md`](decisoes.md) | Decisões do Felipe com data, **mais recente primeiro**. Desempata qualquer conflito |
| [`contexto.md`](contexto.md) | O negócio: quem é, oferta ativa, ICP, regras que não se quebram, o que é legado |
| [`vendas.md`](vendas.md) | Prospecção no OpenBot, cold mail, funil, CRM, regras de copy, playbook de resposta |
| [`site.md`](site.md) | Manutenção do site: stack, deploy, design system, rotas (ativas e legado), blog, checklist |
| [`rotinas.md`](rotinas.md) | O que já roda (OpenBot, Claude, Vercel) e as rotinas propostas para o harness |
| [`milestones.md`](milestones.md) | Método de projetos no Trello (M0, M1…, critério de virada) e milestones do harness |
| [`triagem.md`](triagem.md) | Triagem automática ("auto mode"): complexidade, roteamento para agente/modelo, formato do workflow, exemplo |
| [`feedback.md`](feedback.md) | Loop de feedback: como o Felipe registra (`fb:` no WhatsApp, janela na Central), triagem e registros |
| [`skills.md`](skills.md) | Skills e conectores que existem, o que falta conectar e as skills a criar |
| [`equipe-e-agentes.md`](equipe-e-agentes.md) | Pessoas e agentes (Leonardo, Tyler, Dylan, Quinn, Casey, Harbinger…) e quem faz o quê |
| [`como-o-felipe-trabalha.md`](como-o-felipe-trabalha.md) | Preferências, jeito de decidir e de pedir, o que irrita, o que agrada |
| [`integracoes.md`](integracoes.md) | Mapa de sistemas: Twenty, Vercel, caixas de e-mail, WhatsApp, Trello… |
| [`pendencias.md`](pendencias.md) | O que precisa de decisão, o que já foi decidido e falta executar, riscos |
| [`subagentes.md`](subagentes.md) | **Proposta de arquitetura**: orquestrador + subagentes, escada de modelos, contrato de delegação, janelas de uso |
| [`dashboard.md`](dashboard.md) | Especificação da Central (UI própria): chat, Contexto, feedback, projetos, navegador por bot, cofre, rotinas |
| [`agents/`](agents/) | Definições: `orquestrador`, `triagem`, `pesquisador-leads`, `enriquecedor`, `redator-vendas`, `analista-mercado`, `programador`, `qa-site`, `guardiao` |
| [`openbot/`](openbot/) | **Snapshot** do Harbinger de 14/11 (pode estar defasado; a raiz vale) |
| [`prompts/`](prompts/) | `construir-ui.md`: prompt pronto para a sessão que vai construir a Central |
| [`skills/`](skills/) | `pesquisa-de-preco`, `validacao-de-oferta`, `email-personalizado` (formato SKILL.md) |

## De onde veio cada informação

- **Repositório `madebyfelipe/lpfds`** (`main` e `beta`): `CLAUDE.md`, `docs/*.md`, `lib/*.ts`,
  `vercel.json`, histórico de commits.
- **Tarefas agendadas do Claude**, **~100 sessões anteriores** do Claude Code.
- **Twenty CRM**: campanhas e contagens agregadas. **Nenhum nome ou contato de lead** aqui.
- **Google Agenda e Drive** (`alo@`), lista de skills, conectores e plugins da conta.
- **OpenBot**: levantamento do Harbinger na VPS, guardado em `openbot/`.
- **Decisões de 15/11**: conversa com o Felipe (limpeza de legado).

## Como usar no harness

1. Todo agente carrega `decisoes.md` + `contexto.md` + `como-o-felipe-trabalha.md`.
2. Vendas: + `vendas.md`, `integracoes.md`.
3. Site: + `site.md` e o `CLAUDE.md` do repositório (fonte da verdade técnica).
4. Orquestrador / rotinas: + `rotinas.md`, `equipe-e-agentes.md`, `pendencias.md`,
   `milestones.md`, `feedback.md`.

> Repositório **privado**. Nenhuma senha ou chave entra aqui; segredos ficam no cofre.
