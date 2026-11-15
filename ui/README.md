# Central — UI de agentes da Made by Felipe

Fase 1 (M3): uma janela de chat no layout do OpenBot (faixa de ícones, coluna de
conversas, chat em balões), **triagem sempre ligada**, **voz primeiro**, feedback,
login com 2FA e passkey, Modo Contexto, conectores Twenty, GitHub e MCP genérico.
No ar em https://chat.madebyfelipe.agency. As fases seguintes estão em `../prompts/construir-ui.md`.

## Como funciona o chat

- Abriu = conversa nova pronta, microfone grande. Nada para escolher.
- **Triagem** (`lib/triage.ts`, Sonnet, só leitura): toda mensagem passa por ela. Separa
  **tarefa**, **ideia** (→ `milestones.md`, Entrada), **feedback** (→ `feedback.md`) e
  **decisão** (→ topo de `decisoes.md`), com commit. Para a tarefa, devolve o workflow
  (`triagem.md`) e a Central roda: N1 com o agente do passo; N2 a N4 com o orquestrador em
  Sonnet, Opus ou Fable, seguindo os passos. Pergunta sobre o negócio vai para o Modo Contexto.
  Cada triagem fica na tabela `triages` para calibrar.
- `fb: …` anota feedback direto, sem modelo. `planejar: …` mostra o plano e espera "vai".
- **Voz**: o navegador grava e converte para 16 kHz; a VPS transcreve com Whisper small
  (`lib/transcribe.ts`, transformers.js + ONNX, local, sem provedor). O modelo sobe no
  primeiro áudio (~1,3 GB de RAM) e é solto depois de 10 min parado. Cache em
  `CENTRAL_WHISPER_CACHE` (padrão `~/.central/whisper`). O whisper.cpp pronto para Linux
  não roda no processador da VPS (falta instrução) e o contêiner não tem compilador.
- **Feedback**: `bom · ruim · comentar` em cada resposta e o botão fixo na faixa lateral
  gravam em `feedback.md`, com tela, agente e conversa.
- Falar direto com um agente e trocar o modelo à mão ficam no menu `⋯` (exceção).

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
| `scripts/e2e-portao.mts` | triagem (despejo, `fb:`, `planejar:`, roteamento), feedback, transcrição e microfone, aprovação de terminal e escrita, barreira de segredo, subagente, Modo Contexto. Central com `ANTHROPIC_BASE_URL=http://127.0.0.1:4699 ANTHROPIC_API_KEY=teste` | não |
| `scripts/e2e-chat.mts` | conversa de verdade: oferta do contexto, anexo, guardião, subir de modelo, parar, Modo Contexto com citação | sim, cerca de 12 mensagens |

O `e2e-base` e o `e2e-portao` gravam e fazem commit no repositório (conector de teste,
feedback, ideias): rode a Central com `CENTRAL_REPO_DIR` apontando para uma cópia e passe
o mesmo caminho em `CENTRAL_E2E_REPO`. `CENTRAL_E2E_WAV` (opcional) aponta um WAV 16 kHz
para conferir a transcrição.
