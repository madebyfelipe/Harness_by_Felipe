# Como o Felipe trabalha

Observado em ~100 sessões, 144 commits, no `CLAUDE.md` e nas notas do CRM.

## Jeito de pedir

- Mensagens **curtas, do celular**, muitas vezes com anexo: "merge direto na main",
  "troque essa foto tbm pelo segundo anexo", "pode mergear na main quando terminar".
- Pede por **referência visual**, não por especificação: One Page Love, bymonolog.com
  ("igualzinho, animações etc."), Specia1ne, RD Station (byline + banner), Tegra, Kelvin,
  Frontend Supply.
- Muitas vezes pede **via Tyler** (OpenBot) em vez de abrir sessão.
- Abre várias sessões em paralelo e volta a elas dias depois.

## Respostas da IA para ele (dito pelo Felipe)

- **Bem menos texto que o normal.** Enxuto ao máximo, sem perder o que importa. Nada de
  parágrafo grande, nada de exagero.
- Formato: o que foi feito · o que está no ar · o que precisa dele (se precisar). Listas
  curtas em vez de parágrafo.
- Diz o que **não** foi verificado, numa linha.

## Autonomia (dito pelo Felipe)

- **A IA decide e depois valida com ele.** Não quer fazer babysitting nem ficar
  entendendo o que a IA pretende fazer.
- **Não interromper.** Pergunta só quando está bloqueada ou quando a decisão é dele de
  verdade (preço, oferta, campanha nova, depoimento).
- **Não quer revisar trabalho de IA.** Campanha aprovada uma vez = envio automático; a IA
  é o auxílio de escrita que ele usaria no próprio portal de e-mail. "Rotina é rotina":
  roda sem ele e checa depois.
- **Triagem automática**: manda a tarefa e um Sonnet decide agente, modelo e workflow
  (`triagem.md`).
- **Pedido explícito no site vai direto para o ar**, sem PR: posts do blog, alterações que
  ele pediu. O site não é produto com dado sensível. Branch separada ou worktree só quando
  ele pedir.
- **Avisos pelo WhatsApp**: ele usa a Evolution API (na VPS) para conversar com a IA e
  receber avisos, porque está muito na rua e não quer um app por provedora de IA.

## Escrita (copy, e-mail, post)

- Nada de "cara de IA". Frases simples, de gente.
- **Sem termos técnicos.** Fala do **benefício** para a pessoa, não do entregável.
- **Sem estrutura de comparação**: nada de "não é X, é Y", "mais do que X, Y", "X? Não. Y."
- Regras completas em `skills/email-personalizado/SKILL.md`.

## Como decide

- Decide rápido e muda de ideia quando o mercado responde (oferta mudou 3 vezes em 3 meses;
  ICP de advogados → psicólogos → neurodivergência).
- Decisões viram regra **com motivo e data** no `CLAUDE.md` ("Felipe, nov/2026: 'só o
  vermelho REAL'") e em `decisoes.md`. Agente que mudar algo deve registrar assim.
- **O mais recente vale.** Ele muda de ideia no meio do processo e um arquivo antigo fica
  para trás. Não travar nem perguntar por inconsistência: aplicar a decisão mais nova e
  corrigir o arquivo antigo. Coisa muito antiga sem decisão recente = legado (marcar ou tirar).
- **Não reabrir o que ele fechou**: `/sobre`, grade de marcas, cases na home, versão
  "agressiva" do blog, imagens de IA, `contato@` como e-mail público, preço da imersão.
- Clientes externos e portfólio não entram em venda nem em copy. Depoimentos atuais são
  fictícios e não se usam (15/11).

## O que agrada

- Estética editorial, dura (raio 2px), tipografia grande, pouco vermelho e bem colocado.
- Fotos reais (dele ou de banco licenciado), em boa resolução.
- Coisas que funcionam no **celular**.
- Automação que roda **sozinha de ponta a ponta** e reporta depois (inclui envio de e-mail
  de campanha aprovada).
- Ver o resultado: link de prévia, print, número.
- **Projetos por milestones** no Trello: M0, M1, M2…, cada um com cartão-guia, subtarefas
  e um critério de virada definido pelo agente (`milestones.md`).
- **Loop de feedback**: registrar a impressão dele na hora, sem formulário (`feedback.md`).
  Ele não lembra depois.

## O que irrita (evitar)

- "Pronto" que não está no ar, ou está numa branch que não publica.
- Inventar número, prazo, depoimento, fonte, garantia.
- Promessa de resultado ou qualquer coisa que esbarre no art. 20 / LGPD.
- Retrabalho por não ler o `CLAUDE.md` (cores fora do token, pílula, fonte errada).
- Mexer no que não foi pedido (`/contato`, copy aprovada, depoimentos).
- Perguntar o que dava para descobrir sozinho.

## Ritmo e janelas de tempo (dito pelo Felipe)

- Gosta de **controle por janelas de tempo** e de tudo que for recorrente virar **tarefa
  agendada**.
- **05:00** — primeiros disparos de e-mail do dia (os blocos vão se formando ao longo do dia).
- **05:30** — tarefa "reset": abre a janela de uso da assinatura cedo para o limite
  **resetar às 10:30**.
- **08:30–10:30** — trabalho intenso, gastando a primeira janela.
- **10:30** — reset; segue trabalhando o resto do dia com a janela nova.
- Dia útil cheio de entregas de outros trabalhos (fora do harness).
- Madrugada e começo da manhã são dos agentes (blog, prospecção no OpenBot).
- Domingo: revisão/planejamento (resumo da semana + triagem de feedback).
- Cuidado: qualquer rotina que use a assinatura **antes** das 05:30 abre a janela antes e
  antecipa o reset (ver `subagentes.md` → Janelas de uso).

## Como gosta de usar agentes

- Um **orquestrador** no modelo mais forte (hoje usa muito **Fable 5**) e executores em
  **Sonnet 5.5**. Se o resultado não fica como ele quer, pede para o orquestrador refazer
  com o modelo melhor.
- Admite que delegação não é o forte dele: por muito tempo fez tudo numa janela só, e
  isso deixou de funcionar. O harness deve **fazer a delegação por ele** e mostrar quem fez o quê.
- Gosta do modelo do OpenBot: **cada bot com o próprio navegador** e um **cofre** para
  chaves e logins. Quer uma UI simples própria (ver `dashboard.md`).
- Dois agentes que ele sempre tem: **programador** (tudo que mexe no site) e **vendedor**
  (só disparos). Proposta completa em `subagentes.md`.
