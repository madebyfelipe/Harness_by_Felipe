# Central — UI de agentes da Made by Felipe

Fase 1 (base): login, modos VPS/local, leitura dos arquivos do repositório, chat com o
orquestrador e com qualquer agente, Modo Contexto, conectores Twenty, GitHub e MCP genérico.
As fases seguintes estão em `../prompts/construir-ui.md`.

## Abrir

Precisa de Node 22.13 ou mais novo.

```bash
cd ui
npm ci
npm run build
CENTRAL_MODE=local npm start        # http://localhost:4600
npm run worker                      # em outro terminal: mostra o worker online e traz o git
```

Na primeira vez a Central abre em `/configurar` e pede o código de instalação, que ela
grava em `~/.central/setup-token` (o terminal mostra o caminho). Você cria a senha, liga o
segundo fator (app autenticador) e pode cadastrar uma passkey em **Conta**. Depois disso,
tudo fica atrás do login.

Variáveis: veja `.env.example`. Valores reais vão em `~/.central/env` ou no ambiente do
processo, nunca no repositório. Na VPS use `CENTRAL_MODE=vps`, `CENTRAL_PUBLIC_URL` com o
endereço https e, se quiser Postgres, `DATABASE_URL`.

**Fonte.** A Neue Haas Grotesk Display é licenciada e este repositório é público, então os
TTFs não ficam aqui. Copie os três do repositório do site; sem eles a Central usa Helvetica/Arial.

```bash
cp ../../lpfds/public/fonts/NeueHaasDisplay{Roman,Medium,Bold}.ttf public/fonts/
```

## Modelo

Sem nada configurado, usa o login do Claude Code desta máquina (a assinatura do Felipe).
Com `ANTHROPIC_API_KEY`, cobra na chave. O que foi conferido nos termos está em `AUTH.md`.
Quando a janela da assinatura esgota, o chat avisa a hora em que libera, em Brasília.

## O que roda sem perguntar e o que pede aprovação

| | |
|---|---|
| Ler arquivo, buscar, pesquisar na web, delegar a subagente | roda direto |
| Terminal, escrever ou editar arquivo, ferramenta de conector (MCP) | pede aprovação no chat: Permitir, Sempre nesta conversa ou Negar |
| Chave mestra, banco, `.env`, login do Claude, chaves SSH | barrado sempre, sem pedido |
| Modo Contexto | só lê os `.md` do repositório |

Vale igual para subagente; o cartão diz quem pediu. Subagente e terminal rodam dentro da
resposta, nunca em segundo plano.

## Testes

```bash
npm run typecheck
npm test                 # unidade: 2FA, criptografia, barreiras, conectores, banco
npm run falso            # modelo falso na porta 4699 (não gasta uso)
```

Ponta a ponta, com a Central rodando (prints em `CENTRAL_E2E_OUT`):

| script | o que confere | gasta uso? |
|---|---|---|
| `scripts/e2e-base.mts` | conta, 2FA, passkey, páginas, contraste AA, celular, conectores. Pede pasta de dados vazia | não |
| `scripts/e2e-portao.mts` | aprovação de terminal e escrita, barreira de segredo, subagente, Modo Contexto. Central com `ANTHROPIC_BASE_URL=http://127.0.0.1:4699 ANTHROPIC_API_KEY=teste` | não |
| `scripts/e2e-chat.mts` | conversa de verdade: oferta do contexto, anexo, guardião, subir de modelo, parar, Modo Contexto com citação | sim, cerca de 12 mensagens |

O `e2e-base` cria e apaga um conector de teste, o que gera commits: rode com
`CENTRAL_REPO_DIR` apontando para uma cópia do repositório.
