# Harness — Made by Felipe (vendas + manutenção do site)

Contexto coletado em **14/11/2026** para servir de base a um harness de agentes
focado em **vendas** e **manutenção do site** `www.madebyfelipe.com.br`.

## Arquivos

| arquivo | para que serve |
|---|---|
| [`contexto.md`](contexto.md) | O negócio: quem é, oferta atual, preço, ICP, método, regras que não se quebram |
| [`vendas.md`](vendas.md) | Funil, campanhas, canais, CRM, regras de copy, playbook de resposta, números atuais |
| [`site.md`](site.md) | Manutenção do site: stack, deploy, design system, rotas, blog, checklist de verificação |
| [`rotinas.md`](rotinas.md) | O que já roda sozinho (agendamentos, crons, lotes) e as rotinas propostas para o harness |
| [`skills.md`](skills.md) | Skills e conectores que você tem e usa, o que falta conectar e as skills a criar |
| [`equipe-e-agentes.md`](equipe-e-agentes.md) | Pessoas e agentes (Leonardo, Tyler, Casey, Wren, Dylan, Harbinger…) e quem faz o quê |
| [`como-o-felipe-trabalha.md`](como-o-felipe-trabalha.md) | Preferências, jeito de decidir e de pedir, o que irrita, o que agrada |
| [`integracoes.md`](integracoes.md) | Mapa de sistemas: Twenty, Vercel, caixas de e-mail, Make, WhatsApp, Drive, ClickUp… |
| [`pendencias.md`](pendencias.md) | Decisões em aberto, inconsistências encontradas e riscos |
| [`subagentes.md`](subagentes.md) | **Proposta de arquitetura**: orquestrador + subagentes, escada de modelos, contrato de delegação, janelas de uso |
| [`dashboard.md`](dashboard.md) | Especificação da UI própria: chat, modo Contexto, navegador por bot, cofre, rotinas, fases |
| [`agents/`](agents/) | Definições prontas: `orquestrador`, `pesquisador-leads`, `enriquecedor`, `redator-vendas`, `analista-mercado`, `programador`, `qa-site`, `guardiao` (formato de subagente do Claude Code) |
| [`skills/`](skills/) | `pesquisa-de-preco`, `validacao-de-oferta`, `email-personalizado` (formato SKILL.md) |

## De onde veio cada informação

- **Repositório `madebyfelipe/lpfds`** (branches `main` e `beta`): `CLAUDE.md`,
  `docs/*.md`, `lib/*.ts`, `vercel.json`, `.env.example`, histórico de 144 commits.
- **Tarefas agendadas do Claude** (8 rotinas, 3 ativas) e **~100 sessões anteriores**
  do Claude Code (títulos, resumos e as duas sessões mais recentes do site lidas por inteiro).
- **Twenty CRM**: campanhas, contagens agregadas de leads e oportunidades, títulos e
  algumas notas operacionais. **Nenhum nome ou contato de lead foi copiado** para cá.
- **Google Agenda** (`alo@`), **Google Drive** (arquivos recentes), **ClickUp** (2
  espaços), **Trello** (1 quadro), lista de **skills, conectores e plugins** da conta.
- **Não lidos**: Gmail (o conector respondeu "Mail service not enabled" para esta conta),
  OpenSEO e Postiz (pedem reconexão), servidor do OpenBot (`/data/OpenBot/...` não está
  acessível daqui).

## Como usar no harness

1. Carregue `contexto.md` + `como-o-felipe-trabalha.md` em **todo** agente (é o
   "quem somos e como agimos").
2. Agente de vendas: + `vendas.md`, `integracoes.md`.
3. Agente de site: + `site.md` e o `CLAUDE.md` do repositório (que continua sendo a fonte
   da verdade técnica — este harness resume, não substitui).
4. Orquestrador / rotinas: + `rotinas.md`, `equipe-e-agentes.md`, `pendencias.md`.

> **Atenção:** o repositório é **público**. Estes arquivos têm números do CRM, nomes de
> clientes recorrentes e detalhes de operação. Não foram commitados. Guarde-os num
> repositório privado, no Drive ou no servidor do OpenBot.
