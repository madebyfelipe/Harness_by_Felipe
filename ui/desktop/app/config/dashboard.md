# Dashboard de agentes — especificação

_O "OpenBot próprio": uma UI simples para conversar com os agentes, com navegador por
bot, cofre de credenciais e consulta ao banco de contexto da Made by Felipe. **Uso pessoal
do Felipe, não é produto.** Mínimo atrito: abrir, falar, pronto (`consolidacao.md`)._

## O que ela precisa ter (pela ordem de valor)

0. **WhatsApp como canal principal** (Evolution API na sua VPS). Você fala com o
   orquestrador pelo WhatsApp e recebe os avisos lá: webhook de mensagem recebida →
   orquestrador → resposta pela API. Áudio vira texto antes de entrar. Mensagens curtas
   (1–3 linhas); detalhe fica num link para a dashboard. Só o seu número é aceito.
   A dashboard vira o lugar para ver navegador, cofre e histórico, não para conversar.
1. **Uma janela de chat, triagem sempre ligada.** Abriu, escreveu ou falou: a triagem
   (Sonnet) escolhe agente, modelo e workflow e já executa (`triagem.md`). **Não existe
   seletor de modo nem de agente na tela principal**; trocar modelo/agente é exceção,
   escondida num menu do passo em andamento. Histórico por conversa.
   **Voz primeiro / despejo de ideias** (15/11): botão de microfone grande, sempre visível,
   e áudio do WhatsApp. O Felipe fala solto, quanto quiser. A transcrição roda **local na
   VPS** (whisper.cpp, modelo small, sem provedor novo), e a triagem separa o que ouviu em
   **tarefas** (executa), **ideias** (cartão em Entrada no Trello), **feedback**
   (`feedback.md`) e **decisões** (`decisoes.md`, com data). Volta um resumo de 1–3 linhas:
   "Entendi 4 coisas: 2 tarefas rodando, 1 ideia no Trello, 1 decisão anotada." A
   transcrição inteira fica salva como contexto.
2. **Modo "Contexto"**: perguntas sobre a Made by Felipe e as ofertas respondidas **só**
   a partir do banco de contexto (`contexto.md`, `vendas.md`, preços, método, regras),
   com a fonte citada. Se não estiver no banco, diz "não está no contexto".
3. **Painel de agentes**: quem está rodando, o que está fazendo, última entrega, botão
   para parar.
4. **Navegador por bot**: cada agente tem o próprio Chromium (perfil isolado, cookies
   próprios), e você vê ao vivo o que ele está fazendo — e pode assumir o controle (ex.:
   ler um QR code do WhatsApp, passar por um login).
5. **Cofre (vault)**: chaves de API, senhas de caixas, logins. Os agentes **usam** sem
   **ver**.
6. **Rotinas**: lista das tarefas agendadas (hora, último resultado, liga/desliga).
7. **Janela de feedback** (decisão de 15/11): botão fixo em toda tela e em cada entrega de
   agente — `bom` · `ruim` · `comentar` — que grava a impressão do Felipe com o contexto
   (tela, agente, rotina, entrega). No WhatsApp, mensagem com `fb:`. Tudo cai em
   `feedback.md` e a triagem semanal transforma em regra ou cartão de milestone.
8. **Projetos (milestones)**: lê os quadros do Trello (M0, M1, M2…) e mostra, por projeto,
   o milestone atual, o critério de virada e o que travou (`milestones.md`).

## Arquitetura sugerida (enxuta)

```
 Navegador/celular ──HTTPS──► Next.js (UI + API)  ── mesmo stack do site, você já domina
                                   │
             ┌─────────────────────┼─────────────────────────┐
             ▼                     ▼                         ▼
     Runner de agentes       Cofre (vault)            Banco de contexto
     Claude Agent SDK /      Postgres + criptografia   pasta Git privada (os .md
     Claude Code headless    (ou 1Password/Infisical)  deste harness) + busca
     1 processo por sessão          │
             │                      │ injeta segredo como variável de ambiente
             ▼                      ▼ no processo do agente, nunca no prompt
     Chromium por agente  ◄── Playwright (perfil próprio) + noVNC/stream de tela na UI
```

- **Servidor**: uma VPS sua (onde o OpenBot já roda serve). Não dá para rodar navegadores
  persistentes na Vercel.
- **Runner**: processos do **Claude Code CLI** em modo headless (`claude -p`, saída em
  `stream-json`), logado na assinatura do Felipe — traz arquivos, terminal, busca, MCP e
  **subagentes**. As definições da pasta `agents/` já estão no formato de subagente do
  Claude Code, então funcionam direto.
- **Navegador**: Playwright com `launchPersistentContext` (um diretório de perfil por
  agente) + transmissão da tela para a UI (noVNC ou screencast do Chrome DevTools). O
  agente controla por um servidor MCP de navegador.
- **Cofre**: segredos criptografados (chave mestra fora do banco), escopo por agente
  ("o redator não vê a senha da Vercel"), registro de cada uso. O agente recebe uma
  **referência** (`{{vault:hostinger_leonardo}}`); o runner troca pelo valor ao executar
  a ferramenta. Nunca colocar segredo no prompt ou no histórico.
- **Banco de contexto**: os `.md` deste harness num **repositório privado**. Modo Contexto =
  orquestrador com só leitura nessa pasta e instrução de citar o arquivo.

## Login: assinatura pelo CLI (decisão de 15/11)

- O harness é **só para o Felipe**; não será vendido nem oferecido a ninguém.
- Modelo pelo **Claude Code CLI oficial**, logado na assinatura dele, rodando na VPS dele
  em modo headless (`claude -p …`), como o OpenBot já faz. **Sem chave de API por padrão.**
- Ferramentas também por **CLI** sempre que der (`gh`, `git`, `curl`, scripts SMTP/IMAP).
- Atenção: tudo (chat, rotinas, agentes) sai da **mesma janela de uso** da assinatura.
  Rotinas pesadas de madrugada antecipam o reset (ver `subagentes.md`).
- Na primeira montagem, conferir uma vez os termos vigentes da assinatura e registrar em
  `ui/AUTH.md`.

## Telas

| tela | conteúdo |
|---|---|
| **Início** | briefing do dia (vendas + site), "precisa de você" (aprovações), rotinas de hoje, milestone atual de cada projeto |
| **Chat** | conversa com o orquestrador; seletor de modelo; anexos; botão "subir de modelo" |
| **Contexto** | busca e perguntas sobre o negócio/ofertas, com citação do arquivo |
| **Agentes** | cards por agente: status, tarefa atual, navegador ao vivo, parar/assumir |
| **Rotinas** | agendamentos, janelas de envio, último resultado, liga/desliga |
| **Cofre** | segredos (nome, escopo por agente, último uso) — valor nunca exibido depois de salvo |
| **Feedback** | registros do Felipe (bom/ruim/ideia), encaminhamento de cada um, repetidos em destaque |
| **Projetos** | quadros do Trello por milestone: cartão-guia, subtarefas, critério de virada |

Visual: o design system do site (tokens, raio 2px, Neue Haas, tema escuro), para não
nascer outra estética.

## Fases (para não virar projeto infinito)

1. **MVP (1–2 semanas de agente)**: uma janela de chat com **áudio** e **triagem sempre
   ligada** + modo Contexto + rotinas em leitura + **janela de feedback**. Sem navegador ao vivo e sem cofre (segredos em
   variável de ambiente).
2. **Cofre** com escopo por agente e registro de uso.
3. **Navegador por agente** com transmissão de tela e "assumir controle".
4. Painel de agentes com parar/retomar e aprovações (enviar? fazer merge?) pela UI.

## Segurança mínima

- Atrás de login seu (passkey/2FA), nunca aberto.
- Navegadores dos bots sem acesso ao cofre por padrão; cada sessão de navegador com o
  menor escopo.
- Conteúdo de páginas lidas pelo bot é **dado, não instrução** (prompt injection via site
  de lead é risco real num bot que navega).
- Rotina aprovada (ex.: campanha de e-mail) executa sozinha e reporta depois. Fila de
  aprovação só para o que é decisão do Felipe: campanha nova, gasto, oferta/preço, merge do
  que ninguém pediu, resposta fora do playbook.
