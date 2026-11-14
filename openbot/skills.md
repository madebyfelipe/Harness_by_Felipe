# Skills

Levantamento em 14/11/2026. Skill = procedimento reutilizável que um agente carrega para fazer uma tarefa do mesmo jeito sempre. Há 16 na biblioteca local. A coluna "Quem usa" mostra o que consegui confirmar; os demais agentes podem ter acesso pela biblioteca compartilhada.

## Vendas e CRM

| Skill | O que faz | Observação |
|---|---|---|
| Disparos de e-mail pelo webmail (v4) | Envia e-mails de prospecção e trata respostas pelos scripts SMTP/IMAP da pasta `outreach`, nunca pelo navegador. Confere duplicidade em Enviados, acompanha envios em segundo plano e registra no CRM. | Base da rotina do Dylan. |
| Consultas REST no CRM Twenty | Consulta e grava no CRM por script bash com curl (o servidor não tem Python nem jq), com filtros codificados e leitura validada antes de escrever. | |
| Carga de captura no CRM | Sobe planilha de leads (xlsx, ex.: Google Maps) no CRM: extrai sem Python, deduplica por domínio e nome, pula o que existe e confere a carga. | |
| Segmentação de leads no CRM | Sorteia amostra elegível, marca sem disparar, cria visualização e preenche a etiqueta de canal; usada para listas de cold call. | |
| Medição de campanha de e-mail | Relatório somente leitura por canal, variante, caixa e etapa, com alertas de bounce e SAIR (`benchmark.js`). | Tyler tem instalada. |
| Verificação de perfis do Instagram (v2) | Extrai e-mail profissional, bio e link público de perfis sem levar a conta a bloqueio, e controla o custo do Apify. | |
| Busca de e-mail público | Acha o site oficial e o e-mail público de consultórios e clínicas a partir de uma lista, sem ferramenta paga, e confere a correspondência com o nome. | |
| Disparos WhatsApp com imagem | Envio via WhatsApp Web com foto para leads, com conferência antes e depois e registro no CRM. | **Canal pausado** pelo Felipe. |
| Envio WhatsApp pela Evolution API | Confere se a instância está `open`, localiza grupo ou contato, envia e verifica o resultado. | Nova; usada nos envios do Harbinger. |
| Account Brief | Pontua uma empresa contra o perfil de cliente ideal, lista desqualificadores e perguntas de descoberta. | Do pacote geral. |
| Outreach Draft | Rascunha a primeira mensagem com um motivo verificado e um pedido claro; nunca envia. | Do pacote geral. |
| Evidence Brief | Responde perguntas de pesquisa com afirmações datadas, fonte e rótulo (Verificado, Reportado, Inferência). | Do pacote geral. |

## Conteúdo, design e sites

| Skill | O que faz | Observação |
|---|---|---|
| carrossel-made-by-felipe (v4) | Carrossel de Instagram 1080x1350 para @madebyfelipe.com.br no estilo do feed (Neue Haas, creme/vermelho/preto), copy para salvar e gerar DM, dentro das regras do CFP. Gera slides PNG e legenda. | Tyler tem instalada. |
| carousel-writer-sms | Texto slide a slide para carrosséis (Instagram, LinkedIn etc.). Só texto. | Skill de terceiros (blacktwist, MIT). Tyler tem instalada. |
| Arte de Instagram para posts de blog | Arte 1080x1350 e legenda de um post de blog já publicado, no estilo do perfil de referência do escritório. | Para o blog Alves & Nabuco. |
| Redesign de site por referência | Recria página ou seção a partir de uma referência (ex.: One Page Love), seção por seção, sem hero próprio, verificando cada seção. | Pensada para o Wren/design. |

## Skills padrão do OpenBot
`openbot-data` (banco compartilhado), `openbot-site-hosting` (sites estáticos em openbot.site), `openbot-skill-creator` (criar skills). Estão instaladas em todos os agentes.

## Como pedir uma skill nova
Quando um procedimento se repete e deu certo, peça para registrar como skill: o agente resume os passos genéricos (sem dados pessoais) e instala. Se uma skill falhar em um passo, ela é revisada na hora e a versão sobe.

## Servidores MCP conectados (ferramentas extras para todos os agentes)
github, vercel, supabase, huggingface, onepagelove (inspiração de design: `search_inspiration`, `search_sections`), computer_use. Pedem login: **trello** (e o cartão do blog no Trello fica como pendência). Falharam ao conectar: **cloudflare** e **notion** (endpoint não encontrado).
