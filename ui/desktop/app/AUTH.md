# Autenticação dos modelos — o que foi conferido

Conferido em **14/11/2026**, lendo as páginas oficiais abaixo. Isto é leitura de
documentação, não parecer jurídico. Se os termos mudarem, este arquivo é o que se atualiza.

## O que as páginas dizem (trechos literais)

**Agent SDK — visão geral e quickstart** (`code.claude.com/docs/en/agent-sdk/overview`,
`…/agent-sdk/quickstart`):

> Unless previously approved, Anthropic does not allow third party developers to offer
> claude.ai login or rate limits for their products, including agents built on the Claude
> Agent SDK. Use the API key authentication methods described in this document instead.

**Legal and compliance** (`code.claude.com/docs/en/legal-and-compliance`), seção
"Authentication and credential use":

> OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max,
> Ultra, Team, and Enterprise subscription plans and is designed to support ordinary use of
> Claude Code and other native Anthropic applications.

> Developers building products or services that interact with Claude's capabilities,
> including those using the Agent SDK, should use API key authentication through Claude
> Console or a supported cloud provider. Anthropic does not permit third-party developers
> to offer Claude.ai login into their own applications, or to route requests through Free,
> Pro, Max, or Ultra plan credentials on behalf of their users. Moreover, developers may
> not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to
> a Claude account must complete through Anthropic's own flow.

> Nor does it prevent an end user from signing in to the unmodified Claude Code binary
> with their own Claude subscription […]

Seção "Acceptable use":

> Advertised usage limits for Pro, Max, and Ultra plans assume ordinary, individual usage
> of Claude Code and the Agent SDK.

**Authentication** (`code.claude.com/docs/en/authentication`):

- Ordem de precedência quando há mais de uma credencial: provedor de nuvem →
  `ANTHROPIC_AUTH_TOKEN` → **`ANTHROPIC_API_KEY`** → `apiKeyHelper` →
  **`CLAUDE_CODE_OAUTH_TOKEN`** → perfis → **login da assinatura (`/login`)**.
- No Linux o login fica em `~/.claude/.credentials.json` (modo `0600`).
- Para servidor sem navegador: `claude setup-token` gera um token de um ano, que vai na
  variável `CLAUDE_CODE_OAUTH_TOKEN`. "This token authenticates with your Claude
  subscription and requires a Pro, Max, Ultra, Team, or Enterprise plan."

**Central de Ajuda — "Use the Claude Agent SDK with your Claude plan"**
(`support.claude.com/en/articles/15036540`). Só consegui um resumo da página, não o texto
inteiro:

- 07/10/2026: planos Max, Ultra e Team passaram a incluir créditos mensais de API. Eles
  cobrem Agent SDK e `claude -p` quando rodam **com chave de API** da organização do
  Console ligada à conta.
- Logado com o plano, o uso do Agent SDK e do `claude -p` continua saindo do limite da
  assinatura.
- A mudança anunciada para 15/06/2026 foi suspensa.

## Decisão de 15/11 (decisoes.md): assinatura pelo CLI, uso pessoal

O Felipe decidiu: harness só para ele, modelo pelo Claude Code CLI logado na assinatura,
sem chave de API por padrão. A Central já faz assim: o Agent SDK é uma camada fina que
**executa o binário oficial do Claude Code em modo headless (stream-json)**, o mesmo que
`claude -p --output-format stream-json`, com o login que estiver na máquina. Nada muda no
runner. A chave de API continua possível (ANTHROPIC_API_KEY), mas desligada por padrão.
O risco abaixo ("zona cinzenta" das rotinas) fica registrado: foi uma escolha consciente.

## Leitura para a Central

| ponto | situação |
|---|---|
| Oferecer login do Claude a terceiros | A Central **não faz**. Um dono, um usuário, máquina dele. |
| Guardar ou repassar credencial do Claude | A Central **não lê, não guarda e não transmite** `.credentials.json` nem token. O login é feito pelo fluxo da Anthropic (`claude` ou `claude setup-token`), fora da Central. |
| Binário | O Agent SDK roda o Claude Code sem modificação. |
| Uso pessoal com a assinatura | A documentação fala em "ordinary, individual usage of Claude Code and the Agent SDK" nos limites dos planos. Chat do próprio Felipe cabe nessa descrição. |
| Rotinas automáticas, madrugada, volume | **Zona cinzenta.** A mesma documentação manda quem constrói com o Agent SDK usar chave de API, e "ordinary, individual usage" não descreve bem um agente rodando 24/7 numa VPS. Aqui a Central deve usar **chave de API**. |

Recomendação: assinatura só no chat do Felipe; **chave de API** em rotina, canal WhatsApp e
tudo que roda sem ele na frente. Isso também protege a janela de uso das 05:30 (ver
`subagentes.md`). Quem tem plano Max ou Ultra pode ter crédito mensal de API que cobre
parte disso — vale conferir no Console. Dúvida sobre o caso da VPS: a própria página manda
falar com o time de vendas da Anthropic.

## Como a Central autentica

1. **Sem nada configurado**: usa o login do Claude Code que já existe na máquina (modo
   local: o do computador do Felipe).
2. **`ANTHROPIC_API_KEY` no ambiente** (`~/.central/env`, fora do repo): passa a valer a
   chave, pela precedência acima. A cobrança vai para a chave.
3. **VPS sem navegador, usando a assinatura**: rodar `claude setup-token` no computador do
   Felipe e colocar o resultado em `CLAUDE_CODE_OAUTH_TOKEN` no `~/.central/env` da VPS.
4. O processo do agente recebe só as variáveis de autenticação e o básico do sistema. Os
   segredos dos conectores não entram no ambiente dele.

## O que ainda falta (não está na Fase 1)

- Chave de API **por agente e por rotina**: hoje a escolha é uma só para a instância.
  Entra com as rotinas (Fase 3) e o cofre (Fase 4).
- Guardar a chave no cofre em vez de `~/.central/env` (Fase 4).

## Fontes

- https://code.claude.com/docs/en/agent-sdk/overview
- https://code.claude.com/docs/en/agent-sdk/quickstart
- https://code.claude.com/docs/en/legal-and-compliance
- https://code.claude.com/docs/en/authentication
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
