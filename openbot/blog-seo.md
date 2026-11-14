# Blogs e SEO

Levantamento em 14/11/2026. Há dois blogs com processos diferentes.

## 1. Blog da Made by Felipe (madebyfelipe.com.br)

- **Repositório:** `madebyfelipe/lpfds` (Next.js 16). **Branch de trabalho e de Produção: `beta`** (desde 13/11, o merge na beta já publica na Vercel; testado com o PR #39). Nunca mexer na `main` nem abrir PR para a `main`.
- **Agente:** Casey. **Volume:** duas rodadas por dia (00:30 e 03:00), até 5 artigos novos e longos cada, no máximo 10 por dia. Só artigos novos; o Felipe pediu em 13/11 para não ampliar nem reescrever os antigos. A rotina de ampliação está pausada.
- **Estado:** cerca de 75 arquivos em `content/blog` no clone da Casey. Já entraram nos lotes de 11 e 12/11 (PRs #19, #20, #21 e #29) temas como como conseguir pacientes, Google Ads, WhatsApp Business, linguagem neuroafirmativa, nicho, identidade visual, e-mail profissional, SEO para psicólogos, quanto custa identidade visual, entre outros. A fila de pautas está em `blog-pauta.md` (mínimo 10 linhas).
- **Missão:** tráfego orgânico de psicólogas e consultórios, com foco em quem atende pais de crianças autistas e neurodivergentes, que vire uma conversa de 15 minutos.
- **Padrão de escrita** (`blog-escrita.md`): longo e com SERP pesquisada. Pillar-page 3.000 a 4.000 palavras; guia passo a passo 2.500 a 3.500; dúvida pontual "psicólogo pode X?" 1.500 a 2.000. Estrutura: dor do leitor e resposta curta, o que dizem as normas, seções centrais com exemplo (rotulado como ilustrativo), tabela "pode / evitar", parte para famílias neurodivergentes, erros comuns, checklist, "Como o estúdio trabalha", Fontes. FAQ com 4 a 5 perguntas reais. Pelo menos 5 links internos.
- **Regras de conteúdo:** art. 20 do Código de Ética e Resolução CFP 10/2005. Sem preço, promessa, superlativo, depoimento ou foto de criança. Atendimento online: Resolução CFP 9/2024 (revogou a 11/2018 e o e-Psi). Caso real de cliente só com aprovação do Felipe.
- **Capas:** API Magnific (foto sem pessoas, crédito do autor na legenda), recorte 16:9 até 2400x1350.
- **Controles antes do merge:** build e `tsc` verdes, contagem de palavras dentro da faixa, axe (acessibilidade) sem violações próprias do post (violações do CSS do site vão ao Wren), e a **trava de Produção**: antes do merge, confere de qual branch é o deploy atual, porque em 13/11 um deploy da beta derrubou um layout novo publicado de outra branch.
- **Concorrentes diretos:** Allminds, Agilize, Livance, PowerPsi, MedBusca.
- **Pendências:** cartão do Trello do blog só recebe comentário se o Trello estiver autorizado (hoje pede login). PR de redesign do blog (#25) é de outro agente e não é mexido pela Casey.

## 2. Blog do escritório Alves & Nabuco (advocaciaalvesnabuco.com.br)

- **Repositório:** `madebyfelipe/advocacia_an` (privado), branch `main`. Site estático gerado por `npm run build`; páginas geradas ficam versionadas; blog em `blog/<slug>/index.html`. Push na `main` dispara deploy por FTP na Hostinger (exclui `.github`, `site`, `editorial`, `mockup`, `dist`, `README.md`, `package*.json`).
- **Rotina editorial automática (do próprio repositório, pasta `editorial/`):** terça = tributário (Dr. Milton Alves da Silva Júnior), quinta = trabalhista (Dra. Francini Nabuco). Pesquisa, escreve o rascunho, gera capa 1200x675, valida links, aprova e faz merge; o workflow `editorial-publish.yml` publica no blog e no LinkedIn (LinkedIn pausado). Nunca editar `blog/`, `sitemap.xml`, `rascunhos/` ou `editorial/state/` à mão. Nunca `--force` na `main`.
- **Decisão do Felipe (10/11):** a rotina automática continua; o Blake **não cria posts**. O Blake faz: (1) arte de Instagram 1080x1350 e legenda de cada post publicado; (2) SEO técnico.
- **Arte de Instagram:** estilo do perfil @advocaciamiltonalves: fundo quase preto com arco cinza, cabeçalho com avatar e nome do Dr. Milton, título branco em negrito, apoio de 1 a 2 linhas, CTA "Leia o artigo completo no nosso blog. Link na bio.", capa do artigo com cantos arredondados na base. Salva no workspace do Blake, **nunca no repositório** (iria para o site público).
- **Auditoria de SEO de 10/11:** OK em robots, sitemap (30 URLs), canonical, H1, Open Graph, JSON-LD, links internos, redirecionamentos e velocidade. Corrigido: títulos longos demais nos artigos. **Pendências:** títulos de artigo ainda acima de 60 caracteres; meta descriptions longas ou curtas demais em algumas páginas; títulos genéricos sem palavra-chave local; páginas `/bio-*` indexáveis e duplicadas das de advogados (decisão do Felipe: noindex ou diferenciar); 138 de 143 imagens sem `width` e `height`.
- **Teste de integração:** `editorial-integration.test.mjs` já falhava antes das mudanças do Blake (provável data antiga em fixture).
- **Regras de conteúdo:** pt-BR, útil e original, palavra-chave por artigo, sem promessa de resultado, captação de clientela, comparação, valor de serviços ou sensacionalismo (Código de Ética da OAB e Provimento 205/2021); só fatos de fonte oficial.
- **Wren** (em espera) vai cuidar da experiência do site e do blog: interatividade, leitura, formulários e CTAs, mobile, acessibilidade e desempenho. Ainda sem tarefa.
- **Resumo semanal:** toda sexta 17:00 o Harbinger envia ao grupo de WhatsApp "Marketing | Alves Nabuco" a lista dos artigos da semana (primeiro envio previsto em 13/11 foi feito com 4 artigos; entrega não confirmada).
