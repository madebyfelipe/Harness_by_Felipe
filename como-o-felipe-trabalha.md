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
- **Triagem automática, sempre ligada**: abre o chat, fala, e um Sonnet decide agente,
  modelo e workflow (`triagem.md`). Não quer trocar modo nem escolher agente.
- **Voz primeiro.** Tem preguiça de texto; fala por áudio e descarrega ideia. Quanto mais
  fala, mais contexto. A IA executa; ele não.
- **Mínimo atrito, uso pessoal.** Assinatura e ferramentas pelo CLI, na VPS. Quer parar de
  gerenciar provedora de IA e ferramenta secundária e sair das 30 abas (`consolidacao.md`).
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
- **15:30 e 20:30** — novos resets da grade de 5 em 5h (rotinas `reset-0530/1030/1530/2030`).
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

## Quando for fazer um site (regra fixa, Felipe 16/11/2026)

Vale para criar ou refazer site, LP, página, seção ou componente visual.

1. **Antes de desenhar, leia as duas skills:** `skills/impeccable/SKILL.md` (siga a referência que ele
   indicar; página nova começa em `reference/new-work.md` e, antes de editar qualquer UI,
   `reference/craft-floor.md`) e `skills/apple-design/SKILL.md`.
2. **Quem manda:** pedido do Felipe e referência que ele mandou > design system do site (`CLAUDE.md` do
   repositório do site) > Impeccable > princípios Apple. Não troque a identidade dele por um visual genérico.
   Ele já devolveu trabalho "simples demais, longe da minha identidade e da referência".
3. **Impeccable pede `PRODUCT.md`:** se faltar, escreva a partir de `site.md`, `contexto.md` e do `CLAUDE.md`
   do site, sem perguntar ao Felipe, e siga. Rode `skills/impeccable/scripts/impeccable context` uma vez por
   sessão, de dentro da pasta do site.
4. **Use o navegador embutido** (`navegador_abrir`, `navegador_ler`, `navegador_captura`):
   - para abrir cada referência que ele mandar (One Page Love, ohhmydesign etc.) e estudar layout, ritmo e
     microinterações, antes de escrever código;
   - para abrir a prévia do que foi construído, em 1440x900 e 390x844, e conferir antes de dizer que
     terminou. Mostre a captura com `mostrar_imagem`.
   Subagente não tem navegador: quem delega estuda a referência e passa o resumo; confere a prévia depois.
5. **Imagem de verdade.** Se a página precisa de foto ou ilustração, use as do site ou gere/peça. Não
   entregue só tipografia e blocos.
6. **Servidor de prévia:** porta própria (3400 em diante), em segundo plano, e pare só o processo que você
   mesmo iniciou, pelo PID ou pela porta. **Nunca `pkill`, `killall` ou `pgrep` por nome** (`next`, `node`):
   derruba a Central (aconteceu duas vezes em 16/11).
7. **Entrega:** captura mostrada, link, build limpo, e o que não foi verificado.
