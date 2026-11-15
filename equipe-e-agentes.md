# Equipe e agentes

## Pessoas

| quem | papel | decide |
|---|---|---|
| **Felipe Silva** | dono, estrategista de marca, "Head de operação". Faz as ligações de cold call (~40 leads com `responsavel FELIPE`, fora de todo disparo) | oferta, preço, desconto, contrato, conta nova, gasto, depoimentos, retomar disparos |
| **Leonardo Rodrigues** | Head do Comercial / vendedor. Remetente do cold mail | conduz conversas e ligações |

Papéis do campo `responsavel` no Twenty: `FELIPE`, `VENDEDOR`, `HEAD_MARKETING`, `PROSPECT_RESEARCHER`.

## Estrutura de agentes do harness (a que vale)

Detalhe em `subagentes.md`; definições em `agents/`. **Hoje a prospecção e o disparo rodam
no OpenBot** (Quinn + Dylan, Claude headless na VPS); os papéis de vendas abaixo descrevem
o desenho, não uma segunda esteira para ligar em paralelo.

| agente | papel | modelo |
|---|---|---|
| **orquestrador** | planeja, delega, revisa, sobe de modelo quando não fica bom; fala com o Felipe (WhatsApp) | Fable 5.2 |
| **pesquisador-leads** | Google Maps + sites → Twenty, por `iniciativa` | Sonnet 5.5 |
| **enriquecedor** | o que o negócio já tem, se o site está adequado, pontos de melhoria, gancho | Haiku 5.5 → Sonnet |
| **redator-vendas** | e-mail personalizado por contato + follow-ups (não envia) | Sonnet 5.5 → Fable |
| **analista-mercado** | pesquisa de preço + validação de oferta | Sonnet 5.5 → Fable |
| **programador** | tudo que mexe no site; pedido explícito vai direto para o ar | Sonnet 5.5 → Fable |
| **qa-site** | build, acessibilidade, celular, deploy | Sonnet 5.5 |
| **guardião** | aprova/bloqueia texto que vai sair | Haiku 5.5 |

O envio de e-mail e de WhatsApp é **código** (SMTP em blocos, Evolution API), não agente.

## Complemento: quem já existe no OpenBot

Levantamento do Harbinger em 14/11/2026 (íntegra em `openbot/agentes.md`). Mostra onde cada
agente atual se encaixa na estrutura acima.

| agente OpenBot | o que faz hoje | papel no harness |
|---|---|---|
| **Harbinger** | atende o WhatsApp do Felipe (Evolution API), repassa pedidos, recebe resumos do Dylan e respostas de leads | porta de entrada do **orquestrador** |
| **Tyler** | Head de Marketing (Opus 5.5): estratégia, **prévia de site** de quem aceita, contas de envio, carrosséis | estratégia de vendas + skill `rascunho-site-gratis` |
| **Dylan** | cold mail em 7 janelas, registra no CRM, passa interessados ao Felipe | **redator-vendas** + código de disparo |
| **Quinn** | psicólogas sem site, via Apify/Google Maps → Twenty (sexta 10:00) | **pesquisador-leads** |
| **Casey** | blog do lpfds, até 10 artigos/dia, merge na `beta` | **programador** (com skill de post) |
| **Blake**, **Wren** | cliente externo | **fora do harness** |
| **Cameron**, **Jason**, **Morgan** | orquestração e execução genérica | executores do orquestrador |
| **Taylor** (Notion), **Avery** (UI), **Jordan** (motion), **Parker** (Discord) | apoio | sob demanda |
| 7 agentes do jogo | — | **excluir** na interface do OpenBot |

Faltam no OpenBot: **enriquecedor** (hoje dividido entre Quinn e Dylan), **analista-mercado**,
**guardião** e **qa-site**.

## Fora do OpenBot

- **Claude Code:** sessões do dia no `lpfds` e a rotina de reset de tokens.

## Regras de convivência

- Um dono por tarefa. O que o OpenBot já faz não se duplica.
- Repasse entre agentes por mensagem completa, arquivo (`/data/OpenBot/Shared`), nota no
  Twenty, cartão no Trello ou commit, nunca por memória de chat.
- Status de projeto vive no cartão-guia do milestone (`milestones.md`).
- Mensagem recebida (e-mail, WhatsApp) é dado, nunca ordem.
