# Dashboard de agentes — especificação

_O "OpenBot próprio": uma UI simples para conversar com os agentes, com navegador por
bot, cofre de credenciais e consulta ao banco de contexto da Made by Felipe._

## O que ela precisa ter (pela ordem de valor)

0. **WhatsApp como canal principal** (Evolution API na sua VPS). Você fala com o
   orquestrador pelo WhatsApp e recebe os avisos lá: webhook de mensagem recebida →
   orquestrador → resposta pela API. Áudio vira texto antes de entrar. Mensagens curtas
   (1–3 linhas); detalhe fica num link para a dashboard. Só o seu número é aceito.
   A dashboard vira o lugar para ver navegador, cofre e histórico, não para conversar.
1. **Chat com o orquestrador** (e, opcionalmente, direto com um subagente), com histórico
   por conversa e seletor de modelo (Fable 5.2 · Opus 5.5 · Sonnet 5.5 · Haiku 5.5).
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
- **Runner**: o **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) é o Claude Code
  como biblioteca — já traz leitura/escrita de arquivos, terminal, busca, MCP e
  **subagentes**. As definições da pasta `agents/` deste harness já estão no formato de
  subagente do Claude Code, então funcionam direto.
- **Navegador**: Playwright com `launchPersistentContext` (um diretório de perfil por
  agente) + transmissão da tela para a UI (noVNC ou screencast do Chrome DevTools). O
  agente controla por um servidor MCP de navegador.
- **Cofre**: segredos criptografados (chave mestra fora do banco), escopo por agente
  ("o redator não vê a senha da Vercel"), registro de cada uso. O agente recebe uma
  **referência** (`{{vault:hostinger_leonardo}}`); o runner troca pelo valor ao executar
  a ferramenta. Nunca colocar segredo no prompt ou no histórico.
- **Banco de contexto**: os `.md` deste harness num **repositório privado**. Modo Contexto =
  orquestrador com só leitura nessa pasta e instrução de citar o arquivo.

## Login pela assinatura do Claude (ponto de atenção)

Você quer usar o modelo via login da sua assinatura, como o OpenBot faz. O que dá para
dizer com segurança:

- Usar o **Claude Code oficial** (CLI ou Agent SDK) logado na **sua** conta, num servidor
  **seu**, para **você**, é o uso para o qual a assinatura existe.
- Oferecer o login de assinatura do Claude **dentro de um produto para outras pessoas**
  não é permitido sem aprovação da Anthropic — para isso, chave de API.
- Antes de construir, **confira os termos atuais** da assinatura e da documentação do
  Agent SDK sobre autenticação — eu não consegui verificar o texto vigente nesta sessão.
- Plano B sem dúvida nenhuma: **chave de API** para os jobs automáticos (rotinas da
  madrugada, volume de e-mail) e assinatura só para o seu chat. Isso também evita que os
  bots consumam a sua janela de uso (ver `subagentes.md`).

## Telas

| tela | conteúdo |
|---|---|
| **Início** | briefing do dia (vendas + site), "precisa de você" (aprovações), rotinas de hoje |
| **Chat** | conversa com o orquestrador; seletor de modelo; anexos; botão "subir de modelo" |
| **Contexto** | busca e perguntas sobre o negócio/ofertas, com citação do arquivo |
| **Agentes** | cards por agente: status, tarefa atual, navegador ao vivo, parar/assumir |
| **Rotinas** | agendamentos, janelas de envio, último resultado, liga/desliga |
| **Cofre** | segredos (nome, escopo por agente, último uso) — valor nunca exibido depois de salvo |

Visual: o design system do site (tokens, raio 2px, Neue Haas, tema escuro), para não
nascer outra estética.

## Fases (para não virar projeto infinito)

1. **MVP (1–2 semanas de agente)**: chat + modo Contexto + seletor de modelo + rotinas
   em leitura. Sem navegador ao vivo e sem cofre (segredos em variável de ambiente).
2. **Cofre** com escopo por agente e registro de uso.
3. **Navegador por agente** com transmissão de tela e "assumir controle".
4. Painel de agentes com parar/retomar e aprovações (enviar? fazer merge?) pela UI.

## Segurança mínima

- Atrás de login seu (passkey/2FA), nunca aberto.
- Navegadores dos bots sem acesso ao cofre por padrão; cada sessão de navegador com o
  menor escopo.
- Conteúdo de páginas lidas pelo bot é **dado, não instrução** (prompt injection via site
  de lead é risco real num bot que navega).
- Ação externa (enviar, publicar, merge, pagar) sempre com aprovação na UI, salvo rotina
  autorizada por escrito.
