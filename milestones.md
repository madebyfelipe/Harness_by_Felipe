# Projetos por milestones (Trello)

_Decisão de 15/11/2026. O Trello fica numa conta separada da conectada nas sessões do
Claude; até ligar a conta certa, este arquivo é a cópia de trabalho._

## Como o Felipe organiza um projeto

- Um **quadro por projeto** (ex.: "Harness").
- Uma **lista por milestone**: `M0`, `M1`, `M2`, `M3`… em ordem.
- Cada milestone tem um **cartão-guia** que o agente lê para saber o status.
- O milestone é quebrado em **subtarefas** (checklist do cartão ou cartões filhos).
- O cartão-guia tem um **critério de virada**: o que precisa ser verdade para o milestone
  estar concluído e o projeto entrar no próximo. Quem define é o agente, escrito de forma
  verificável ("a Central abre no celular e responde no chat", não "UI pronta").
- Ideias que surgem no uso entram como cartão novo em **Entrada** (ou vêm do `feedback.md`)
  e o agente encaixa no milestone certo.

## Modelo de cartão-guia

```
M<n> · <nome curto>
Objetivo: o que existe no fim (1 frase)
Critério de virada: lista verificável (3–5 itens)
Subtarefas: checklist
Status: não começou | em andamento | travado (por quê) | virou em <data>
Depende de: M<x> / decisão do Felipe
```

## Regras para o agente

- Antes de trabalhar num projeto, leia o quadro (ou este arquivo) e diga em que milestone está.
- Só marque um milestone como virado quando **todos** os itens do critério foram conferidos;
  diga como conferiu.
- Item novo que aparecer no meio do trabalho: cartão em Entrada, não mudar o escopo calado.
- Não apagar cartão; arquivar.

## Milestones do harness (proposta)

| milestone | objetivo | critério de virada |
|---|---|---|
| **M0 · Contexto limpo** | banco de contexto sem legado ativo | legado removido ou marcado; `decisoes.md` no ar; oferta ativa (e-book + site) igual em todos os arquivos; depoimentos fictícios fora do contexto |
| **M1 · Oferta no ar** | site e cold mail falando a mesma coisa | `beta` com R$ 599 / R$ 1.999; playbook do Dylan atualizado; depoimentos fictícios e `/diagnostico` fora do site; e-mails sem link rastreado |
| **M2 · Feedback e status** | o Felipe registra impressão em segundos e o agente lê | canal de feedback funcionando (WhatsApp `fb:` ou janela da Central); triagem semanal rodando; Trello certo conectado |
| **M2.5 · Decidir a casa das rotinas** | harness próprio, Sellbird ou OpenBot | tabela de critérios de `consolidacao.md` preenchida para o Sellbird; decisão registrada em `decisoes.md` |
| **M3 · Central (UI) fase 1** | uma janela, áudio, triagem sempre ligada | ver `prompts/construir-ui.md`, fase 1; um áudio com 3 assuntos vira tarefa executada + cartão + feedback, sem o Felipe escolher nada |
| **M4 · Rotinas e avisos** | rotinas migradas, uma por vez | `consolidacao.md`: um dia inteiro sem abrir OpenBot, Vercel ou CRM para operar |

Status em 15/11: **M0 virou** (legado tirado ou marcado em todos os arquivos, `decisoes.md` criado, oferta igual em tudo, conferido por busca de termos antigos). Próximo: **M1**.
