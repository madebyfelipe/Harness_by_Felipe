# Blogs e SEO

> ⚠️ **Snapshot de 14/11/2026, feito pelo Harbinger.** Pode estar defasado. Onde discordar
> dos arquivos da raiz, vale `decisoes.md` (o mais recente). Já mudou desde então: preço do
> site agora é R$ 599 / R$ 1.999 até 12x; rastreio de clique e diagnóstico descartados;
> clientes externos fora do harness.

Levantamento em 14/11/2026.

## 1. Blog da Made by Felipe (madebyfelipe.com.br)

- **Repositório:** `madebyfelipe/lpfds` (Next.js 16). **Branch de trabalho e de Produção: `beta`** (desde 13/11, o merge na beta já publica na Vercel; testado com o PR #39). Nunca mexer na `main` nem abrir PR para a `main`.
- **Agente:** Casey. **Volume:** duas rodadas por dia (00:30 e 03:00), até 5 artigos novos e longos cada, no máximo 10 por dia. Só artigos novos; o Felipe pediu em 13/11 para não ampliar nem reescrever os antigos. A rotina de ampliação está pausada.
- **Estado:** cerca de 75 arquivos em `content/blog` no clone da Casey. Já entraram nos lotes de 11 e 12/11 (PRs #19, #20, #21 e #29) temas como como conseguir pacientes, Google Ads, WhatsApp Business, linguagem neuroafirmativa, nicho, identidade visual, e-mail profissional, SEO para psicólogos, quanto custa identidade visual, entre outros. A fila de pautas está em `blog-pauta.md` (mínimo 10 linhas).
- **Missão:** tráfego orgânico de psicólogas e consultórios, com foco em quem atende pais de crianças autistas e neurodivergentes, que vire uma conversa de 15 minutos.
- **Padrão de escrita** (`blog-escrita.md`): longo e com SERP pesquisada. Pillar-page 3.000 a 4.000 palavras; guia passo a passo 2.500 a 3.500; dúvida pontual "psicólogo pode X?" 1.500 a 2.000. Estrutura: dor do leitor e resposta curta, o que dizem as normas, seções centrais com exemplo (rotulado como ilustrativo), tabela "pode / evitar", parte para famílias neurodivergentes, erros comuns, checklist, "Como o estúdio trabalha", Fontes. FAQ com 4 a 5 perguntas reais. Pelo menos 5 links internos.
- **Regras de conteúdo:** art. 20 do Código de Ética e Resolução CFP 10/2005. Sem preço, promessa, superlativo, depoimento ou foto de criança. Atendimento online: Resolução CFP 9/2024 (revogou a 11/2018 e o e-Psi). Caso real de cliente só com aprovação do Felipe.
- **Capas:** API Magnific (foto sem pessoas, crédito do autor na legenda), recorte 16:9 até 2400x1350.
- **Controles antes do merge:** build e `tsc` verdes, contagem de palavras dentro da faixa, axe (acessibilidade) sem violações próprias do post (violações do CSS do site viram tarefa do site), e a **trava de Produção**: antes do merge, confere de qual branch é o deploy atual, porque em 13/11 um deploy da beta derrubou um layout novo publicado de outra branch.
- **Concorrentes diretos:** Allminds, Agilize, Livance, PowerPsi, MedBusca.
- **Pendências:** PR de redesign do blog (#25) é de outro agente e não é mexido pela Casey.

_O blog de cliente externo que também aparecia aqui saiu do harness (15/11/2026)._
