# Central desktop

O app de computador da Central: a mesma interface da web, rodando na máquina do Felipe.

**O que ele é:** uma janela do Electron que sobe o servidor da Central em `127.0.0.1`, numa porta livre, e abre o app. Não é uma segunda Central: usa o mesmo código de `ui/`.

## Dois modos

Na primeira vez o app pergunta onde a Central roda. Dá para trocar depois no menu **Modo** (o app reinicia).

| Modo | O que abre | Login |
| --- | --- | --- |
| **Na VPS** | `https://chat.madebyfelipe.agency` dentro da janela | a mesma conta da web (senha ou passkey); a sessão fica guardada no perfil `persist:central-vps` e sobrevive a fechar o app |
| **Nesta máquina** | servidor local em `127.0.0.1` | conta da Central local (`~/.central`) |

- No modo VPS não precisa de Node nem de Claude Code no computador: os agentes rodam na VPS.
- No modo VPS o seletor de pastas nativo some (as pastas seriam do computador, e os agentes estão na VPS); a tela se comporta como a web.
- Se a VPS não responder, o app oferece tentar de novo ou abrir a Central local.
- `CENTRAL_DESKTOP_MODE=local|vps` força o modo; `CENTRAL_VPS_URL` troca o endereço da VPS.
- A escolha fica em `~/.central/desktop.json`.

## O que precisa na máquina (modo local)

- **Node.js 22 ou mais novo** no PATH (o mesmo que o Claude Code usa). Sem ele, o app tenta o Node embutido no Electron, mas o caminho recomendado é o do sistema.
- **Claude Code instalado e logado** (`claude` no PATH) ou uma chave de API cadastrada em Configurações → Provedores de IA.
- Windows 10/11 (o instalador NSIS é gerado com `dist:win`), Linux ou macOS.

## Montar e abrir

Dentro de `ui/`:

```bash
cd desktop
npm install            # Electron + electron-builder (só na primeira vez)
npm run montar         # build do Next em standalone e junção em desktop/servidor
npm run app            # abre a janela
```

Gerar instalador:

```bash
npm run dist:win       # dist/Central Setup 0.1.0.exe
npm run dist:linux     # dist/Central-0.1.0.AppImage
npm run dist:mac       # dist/Central-0.1.0.dmg
```

O instalador do Windows precisa ser gerado no Windows (ou no Linux com wine); o AppImage sai direto no Linux.

## Onde cada coisa fica

| O quê | Onde | Para quê |
| --- | --- | --- |
| Dados | `~/.central` | banco SQLite, chave mestra, anexos, log (`desktop.log`) |
| Configuração | `~/Central/config` | cópia gravável de `agents/`, `skills/`, `connectors/`, `routines/`, `prompts/` e dos `.md` de contexto |
| Projetos | `~/Central/Projetos` | uma pasta por projeto criado automaticamente |

Na primeira execução, `servidor/config` (que veio no instalador) é copiado para `~/Central/config`. A partir daí, o Felipe edita essa cópia pelas telas da Central — atualizar o app não sobrescreve.

Variáveis de ambiente aceitas (todas opcionais): `CENTRAL_DATA_DIR`, `CENTRAL_REPO_DIR`, `CENTRAL_PROJECTS_DIR`, `CENTRAL_NODE`, `CENTRAL_ALLOWED_DIRS` (pastas extras liberadas para os agentes, separadas por `:`).

## Pastas de projeto

- Projeto novo, sem pasta escolhida, ganha `~/Central/Projetos/<nome-do-projeto>` sozinho.
- O botão **Escolher…** abre o diálogo nativo do sistema (`dialog.showOpenDialog`), com opção de criar pasta.
- A pasta escolhida pode ficar em qualquer lugar do computador, inclusive dentro de um repositório git já existente.
- O agente trabalha **dentro dessa pasta** (`cwd`), com o repositório de configuração ainda acessível para ler agentes e contexto.
- A pasta nunca pode ser a raiz do disco, `~/.ssh`, `~/.claude`, `~/.central` ou outra pasta de segredos.
- Apagar o projeto no app **não apaga a pasta** no disco.

## Segurança

- `contextIsolation` ligado, `nodeIntegration` desligado, preload expõe só quatro chamadas (escolher, criar, abrir pasta e informações).
- Nenhuma porta aberta para fora: o servidor escuta só em `127.0.0.1`.
- Fora da pasta do projeto e do repositório, ler arquivo pede aprovação no chat; `.env`, chaves e pastas de segredo continuam bloqueados sempre.
- O login da Central (senha/passkey) é o mesmo da web. A sessão fica no perfil do Electron.

## Limites conhecidos

- Sem atualização automática: gerar instalador novo e instalar por cima.
- Sem assinatura de código: o Windows mostra o aviso do SmartScreen na primeira execução.
- O instalador Windows não foi gerado nesta máquina (Linux sem wine); a configuração do `electron-builder` está pronta.
- O app desktop não roda o `worker/` da VPS (batimento e sync de git); o agendador de rotinas sobe junto com o servidor.
