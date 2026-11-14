# Subagentes — proposta de arquitetura

_Proposta de 14/11/2026, a partir de como você já trabalha (OpenBot + Claude) e do que
quer: um orquestrador forte que delega para executores mais baratos e sobe de modelo
quando o resultado não fica bom._

## A ideia em uma tela

```
                        ┌───────────────────────────────┐
   Você (chat/celular) ─►│  ORQUESTRADOR  · Fable 5.2     │  planeja, delega, revisa, decide quando subir de modelo
                        └──────┬───────────────┬────────┘
            ┌──────────────────┼───────────────┼───────────────────┐
            ▼                  ▼               ▼                   ▼
   ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐
   │ VENDAS         │  │ SITE         │  │ MERCADO      │  │ GUARDIÃO       │
   │ pesquisador    │  │ programador  │  │ analista     │  │ (revisor de    │
   │ enriquecedor   │  │ qa-site      │  │ (preço +     │  │ tudo que sai)  │
   │ redator        │  │              │  │  oferta)     │  │                │
   └───────┬────────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘
           ▼                  ▼                 ▼                  ▼
   Twenty · Hostinger   GitHub · Vercel   web · Twenty      bloqueia ou aprova
   (envio é código,     (merge na beta    (relatório)       (nunca reescreve
    não modelo)          é você)                             sozinho)
```

## Regra para decidir: agente, skill ou código?

| é… | quando | exemplo seu |
|---|---|---|
| **Código / cron** | a tarefa é determinística e não precisa de julgamento | disparar e-mail pelo SMTP em blocos, rampa por caixa, ler IMAP, descadastro |
| **Skill** | é um **procedimento** que qualquer agente segue | pesquisa de preço, validação de oferta, regras de e-mail e assinatura |
| **Subagente** | precisa de **contexto próprio**, ferramentas próprias (navegador, repo) ou de **outro modelo** | pesquisar no Google Maps, programar o site, revisar o que outro escreveu |

O erro mais comum: transformar procedimento em agente. Um agente a mais é mais uma
conversa para coordenar; uma skill a mais é só um arquivo.

## Os papéis

| subagente | modelo | sobe para | ferramentas | entrega | não pode |
|---|---|---|---|---|---|
| **orquestrador** (sessão principal) | **Fable 5.2** | — | tudo, mais delegação | plano, delegação, revisão final, resposta para você | executar trabalho braçal que um executor faz |
| **pesquisador-leads** | Sonnet 5.5 | — | navegador (Google Maps, sites), API do Twenty | leads novos no Twenty com `iniciativa`, fonte e dados públicos | inventar e-mail/telefone; gravar sem checar duplicado |
| **enriquecedor** | Haiku 5.5 (volume) | Sonnet 5.5 | navegador/fetch, Twenty | por lead: o que o site tem, se está adequado, 3 pontos de melhoria, gancho | escrever o e-mail |
| **redator-vendas** | Sonnet 5.5 | Fable 5.2 | Twenty, skill `email-personalizado` | 1º e-mail + follow-ups por lead, em fila para o bloco | **enviar** (quem envia é o código de disparo) |
| **analista-mercado** | Sonnet 5.5 | Fable 5.2 | busca web, navegador, skills `pesquisa-de-preco` e `validacao-de-oferta` | relatório de preço por mercado/estado e veredito da oferta | publicar preço; mudar oferta |
| **programador** | Sonnet 5.5 | **Fable 5.2** | repo, terminal, navegador | branch + PR (ou commit na branch) com build passando | merge na `beta`; mexer no que não foi pedido |
| **qa-site** | Sonnet 5.5 | — | navegador (desktop e celular), axe-core, `gh` | relatório: passou/falhou, com print | corrigir (devolve para o programador) |
| **guardião** | Haiku 5.5 | Sonnet 5.5 | só leitura | aprova ou bloqueia texto que vai sair (e-mail, post, página) contra art. 20, LGPD, oferta atual e assinatura | reescrever por conta própria |

Por que o **guardião** e o **qa-site** são separados de quem produz: quem escreveu não
deve aprovar o próprio trabalho. Eles são baratos (Haiku/Sonnet) e pegam o erro antes de
você.

## Escada de modelos (o "não ficou do jeito que eu gosto")

1. Executor em **Sonnet 5.5** faz.
2. Guardião/QA revisa. Reprovou → executor corrige **uma vez**, com o motivo.
3. Reprovou de novo, ou você disse "não ficou bom" → o orquestrador **refaz com Fable 5.2**
   (mesmo briefing + o que deu errado), não pede ao Sonnet uma terceira vez.
4. Tarefas que já começam no Fable: arquitetura do site, redesign, copy de oferta nova,
   qualquer coisa que você já sabe que o Sonnet erra.

Referência de custo (API, por milhão de tokens, entrada/saída): Fable 5.2 $8/$40 ·
Opus 5.5 $4/$20 · Sonnet 5.5 $2/$10 · Haiku 5.5 $0,10/$0,50. Na assinatura o custo é
teto de uso, não dólar — e é por isso que o volume vai para Haiku/Sonnet.

> Vale testar o **Opus 5.5** como degrau intermediário antes do Fable: custa metade e
> resolve boa parte do que o Sonnet não resolve.

## Como o orquestrador delega (contrato)

Toda delegação leva estes cinco campos. Sem eles, o executor adivinha.

```
OBJETIVO:     o que precisa existir no fim (1 frase)
CONTEXTO:     arquivos/links do banco de contexto que valem (contexto.md, vendas.md…)
ENTRADA:      dados concretos (ids de lead, branch, URL)
PRONTO QUANDO: critério verificável ("build passa e axe = 0", "25 leads com fonte")
NÃO FAÇA:     limites (não enviar, não fazer merge, não mudar preço)
```

E toda volta traz: o que fez, o que **não** fez e por quê, o que verificou, o que
precisa de você.

## Mapeamento com o que você já tem

| hoje (OpenBot) | nesta proposta |
|---|---|
| Tyler | orquestrador |
| Casey (site + blog) | programador (+ skill `post-blog-psico`) |
| Wren (design/front) | programador com escalada para Fable + qa-site |
| Dylan (cold mail) | redator-vendas + código de disparo |
| Harbinger (WhatsApp) | código/integração (Evolution API) — não precisa de modelo para enviar |
| bot de Google Maps | pesquisador-leads |
| — (falta) | enriquecedor, analista-mercado, guardião, qa-site |

## Janelas de uso (importante para a sua rotina)

Sua rotina de "reset" assume que o limite da assinatura é uma janela de ~5h contada a
partir do **primeiro uso** depois da janela anterior. Se for assim:

- **Quem roda primeiro abre a janela.** As duas rotinas editoriais da Alves & Nabuco
  disparam às **05:00** e o bot de e-mail às 05:00 — então a janela já abre às 05:00 e
  reseta por volta de **10:00**, não 10:30. O "Oi" das 05:30 cai dentro dela e não muda nada.
- Para o reset cair às 10:30: nada que use a assinatura entre ~00:30 e 05:30, e o "Oi" (ou
  o 1º bloco de e-mail) exatamente às 05:30.
- Trabalho pesado de agente na madrugada (01h–05h) **empurra** o seu reset. Se precisar
  de madrugada, use chave de API para esses jobs, não a assinatura.

Detalhe das definições prontas: pasta `agents/`. Skills: pasta `skills/`.
