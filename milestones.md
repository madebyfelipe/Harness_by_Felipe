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
| **M3.1 · Central no layout do OpenBot** | faixa de ícones, coluna de conversas, chat em balões (pedido de 15/11) | feito em 15/11: Central em chat.madebyfelipe.agency com triagem sempre ligada, microfone (Whisper local), feedback por resposta e botão fixo |
| **M3.2 · Central desktop** | app de computador que roda a Central local: escolher a pasta de trabalho, abrir projetos, git, terminal, tudo na máquina, como o Claude Code (pedido de 15/11) | o Felipe instala no Windows, escolhe uma pasta, conversa com a triagem e um agente edita e faz commit num repositório local; login pelo Claude Code da máquina |
| **M4 · Rotinas e avisos** | rotinas migradas, uma por vez | `consolidacao.md`: um dia inteiro sem abrir OpenBot, Vercel ou CRM para operar |

Status em 15/11 (madrugada):

- **M0 virou.** Legado tirado ou marcado; `decisoes.md` no ar; oferta igual em tudo.
- **M1 virou em 15/11** — conferido no site publicado (`www.madebyfelipe.com.br`): home, `/en` e `/lp/marca` sem nenhuma menção a depoimento; `/diagnostico` e `/r/abc` em **404**; `/lp/site` com **R$ 599 / R$ 1.999**; `vercel.json` sem crons. Commit `c5617ce` na `beta`.
- **M2 em andamento.** Canal de feedback funciona (janela da Central + `fb:` no WhatsApp). Rotina semanal de triagem **ligada** (`routines/resumo-semana.yaml`, domingo 20:00), mas ainda não rodou uma vez. **Trello travado**: o conector está em outra conta (só o Felipe resolve).
- **M2.5 travado.** Sellbird sem nome/recursos confirmáveis e sem acesso; tabela de `consolidacao.md` preenchida até onde dá. Decisão provisória registrada: harness próprio.
- **M3 bloqueado no Felipe**: o critério é um áudio com 3 assuntos do celular; os testes automáticos de chat dependem disso.
- **M3.2 com estrutura pronta.** App Electron monta e abre (testado com display virtual: janela, `/configurar`, ponte de pastas criando e recusando `../`); zip do Windows em `/baixar`. Desde 15/11 (tarde) tem **modo VPS**: entra com a mesma conta da web (testado: abre o login da VPS). **Falta o Felipe instalar no Windows**, escolher pasta e ver um agente editar e commitar num repo local.
- **M4 não começou de verdade**: falta migrar rotina por rotina e o teste "um dia sem abrir OpenBot" (depende de Evolution e contas).
- **Base de memória e autonomia** (pedido de 15/11): memória durável por agente, revisão automática de aprendizado, curador semanal e autonomia por agente em `memoria/README.md` e `decisoes.md`. Não é milestone; é fundação para o M4.

Central em 15/11 (noite), pelas fases de `prompts/construir-ui.md`:
- **Fase 1 (base)**: feita. Falta o critério de virada conferido pelo Felipe no celular (áudio com 3 assuntos).
- **Fase 2 (agentes e habilidades)**: feita. Criar, editar, duplicar, pausar e excluir pela tela, com commit; importação do OpenBot como rascunho pausado; agentes também criam agente, habilidade, rotina e app pelo chat, com aprovação.
- **Fase 3 (rotinas e WhatsApp)**: agendador, tela de rotinas, aviso de saída e monitor de janela feitos. **Canal de entrada do WhatsApp feito** (webhook com token, texto e nota de voz transcrita aqui, resposta de volta, aprovação por "ok"/"não", "pare" interrompe); falta ligar na Evolution com um número que não seja o do Felipe. Janelas de envio de e-mail não começaram.
- **Fase 4 (cofre e navegadores)**: feita. Cofre com escopo por agente e segredo por referência (`{{vault:NOME}}`, valor só depois da aprovação); navegador por agente com tela ao vivo na tela Navegadores, bloqueio de rede interna, controle pelo Felipe e cofre separado por agente; colar e arrastar arquivo no chat.
- **Fase 5 (aprovações, registros, demais conectores)**: **feita**. Aprovação no chat e modo automático; fila única em `/aprovacoes` (decide de qualquer conversa, atualiza a cada 5 s) e `/registros` (execuções com modelo/custo/tokens, aprovações e auditoria). Conectores restantes dependem de conta.

Feito em 15/11 (tarde), fora das fases:
- **Abas de subagentes** no topo do chat (pedido, passos e resposta de cada um) e **painel Tasks** acima da caixa.
- **Celular no estilo do app do OpenBot**: gaveta lateral, lista com título grande e busca flutuante, chat com botões redondos, configurações em cartões.
- **VPS sem amarra ao repositório**: agentes leem, escrevem e sobem servidor na máquina toda; sistema pede aprovação; pastas de login e chave fechadas.
- **Publicação sem derrubar execução** (`deploy-prod.sh`): build em pasta separada, espera a produção ficar sem execução, troca e religa.

## Entrada (ideias)

_Ideias que chegam pela Central ou pelo WhatsApp. Até o Trello certo estar ligado, ficam aqui; a triagem semanal encaixa cada uma._

- ~~15/11/2026 · "Uma estrutura de abas na barra superior … uma aba para cada subagente"~~ — **feito 15/11** (abas de subagentes no topo do chat).
