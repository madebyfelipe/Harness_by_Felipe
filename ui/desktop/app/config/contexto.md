# Contexto do negócio — Made by Felipe

_Coletado em 14/11/2026 · limpeza de legado em 15/11/2026 (ver `decisoes.md`; o mais
recente vale)._

## Em uma frase

Estúdio de **branding para psicólogas e consultórios de psicologia**, com foco em quem
atende **famílias de crianças autistas e neurodivergentes**. Hoje vende **sites** (low
ticket, preço público) e capta com um **e-book** gratuito.

## Quem é

- **Felipe Silva** (Felipe Rodrigues da Silva), estrategista de marca, ~7 anos de mercado,
  150+ projetos (número usado só na bio do `/hub`; o JSON-LD **não** afirma isso, por falta
  de prova). Assina como "Head de operação". Base: **Sorocaba (SP)**. Para o público dos
  EUA: "Remote, based in São Paulo, Brazil".
- **Leonardo Rodrigues**: Head do Comercial / SDR (`leonardo@madebyfelipe.com.br`).
- Agentes de IA (OpenBot + Claude) fazem boa parte da execução. Ver `equipe-e-agentes.md`.
- Identificação legal: **CNPJ 68.121.518/0001-17**, ativo, em nome de **Dazz Marketing
  Soluções de Marketing** (é o CNPJ do próprio Felipe; confirmar a grafia exata da razão
  social). Domínio da PJ: `dazzmarketing.com.br` (caixa de envio C). Município no cadastro: Curitiba/PR. Razão social, logradouro, número e CEP
  **ainda vazios** em `lib/legal.ts`.

### Como se apresenta (regra de voz)

- "Made by Felipe" é a **marca**; quem fala é **o Felipe, profissional**. Nunca "sou da
  Made by Felipe", "nossa agência", "nossa equipe" — fica tosco.
- Felipe: "Me chamo Felipe, trabalho com construção de marca para psicólogos,
  especificamente no mercado de psicologia."
- Leonardo: "Sou o Leonardo, sou o vendedor aqui e trabalho junto com o Felipe, que é
  estrategista de marca e especialista no mercado de psicologia."
- Detalhes e exemplos: `skills/email-personalizado/SKILL.md`.
- Contato público: `alo@madebyfelipe.com.br` · WhatsApp `+55 15 99283-5226`.
- Redes: Instagram `@madebyfelipe.com.br`, LinkedIn `/in/madebyfelipe`, Behance
  `madebyfelipe`, TikTok `@madebyfelipe`.

## Público (ICP)

| frente | quem | onde |
|---|---|---|
| **Principal** | Psicólogas em consultório próprio ou pequena clínica que ela conduz, que atendem **pais de crianças/adolescentes autistas (TEA) e neurodivergentes** (TDAH, dislexia, altas habilidades, atraso de desenvolvimento) | Sorocaba, Itu, Campinas, Jundiaí, Piracicaba, SP capital; online, Brasil todo |
| Sinais fortes | orientação/treino parental, grupo de mães e pais atípicos, intervenção precoce, ABA, Denver (ESDM), avaliação neuropsicológica infantil com devolutiva, conteúdo próprio para pais | |
| Descartar | redes/franquias, hospitais, órgão público, associações, só pesquisa/docência, sem e-mail/telefone profissional publicado | |
| Em teste (pausadas, **oferta a definir**) | negócios locais com site fraco (Sorocaba/Votorantim); consultórios de saúde mental nos EUA (TX, NC, AZ) | |

Histórico do ICP: advogados (até ago/2026, Provimento 205 da OAB) → consultórios de
psicologia (ago/2026) → recorte em neurodivergência (out/2026). **Não voltar** para
"consultórios de psicologia" genérico nem para advocacia.

## Posicionamento: fugir de commodity

- O que se vende é o que muda para o consultório: ser escolhida por quem procura, os pais
  entenderem o trabalho antes da 1ª consulta, sustentar o valor da sessão, marca pessoal.
- Página, logo e post são meio, nunca o assunto da venda — vale também para o site.
- **Social media e tráfego pago**: ficam fora do discurso.

## Oferta ativa (decisão de 15/11/2026)

Só dois produtos estão ativos. Qualquer outro (diagnóstico, webinar, recém-formados,
imersão) **não se oferta** — ver "Legado" abaixo.

### 1. Site — produto low ticket para psicólogas

> Preço decidido em 14/11/2026: **R$ 599 / R$ 1.999** prevalece sobre R$ 440 / R$ 1.540
> (playbook do Dylan) e R$ 440 / R$ 1.550 (versão antiga da `beta`).

| plano | preço | inclui |
|---|---|---|
| Página única | **R$ 599** | site no ar, Perfil da Empresa no Google configurado, conteúdo revisado pelas normas do CFP |
| Site institucional | **R$ 1.999** | até 8 páginas, SEO, Perfil no Google, revisão CFP — **não inclui blog** |

- **Até 12x sem juros**, **sem mensalidade** (depois do 1º ano, só a renovação do domínio).
- Antes de fechar: **rascunho sem compromisso** (CTA "Quero ver meu rascunho"). Na
  prospecção fria: "rascunho de site, sem custo" — ver `vendas.md`.
- **Prazo não informado** — fica para a conversa. Não inventar prazo nem garantia.
- Manutenção/renovação: valor ainda não definido ("vou confirmar").
- Em inglês: **sem preço**.

### 2. E-book (gratuito)

- E-book de construção de marca para psicólogos, liberado após cadastro na newsletter
  (`/hub#ebook`) → Twenty (workflow `email_listing_hub`).

### CTA de conversa

- **Conversa de 15 minutos** (`cal.com/madebyfelipe/15min`) segue como CTA do blog e da
  home. Não é produto.

### Legado (não ofertar, não citar como atual)

| item | situação |
|---|---|
| **Imersão de marca** (2 encontros de ~1h30, até 30 dias com site; antes 2 dias/45 dias) | não citada como ativa em 15/11 — **não ofertar até o Felipe confirmar**. Preço nunca foi público; os planos mensais de `lib/data.ts` (R$ 1.200–2.500) não valem |
| **Diagnóstico gratuito** (`/diagnostico`, Índice, bandas, gargalo) | descartado em 15/11 |
| Webinar, página recém-formados | fora da oferta ativa |
| Rastreio de clique (`/r/<token>`) | descartado em 15/11 |

## Método PSIQUE

_Método da imersão (hoje fora da oferta ativa). Continua na copy aprovada do site; serve de
referência de voz, não de oferta._

Tese: **"Branding é tradução, não invenção."** A marca é traduzida de seis áreas:

| letra | área | o que investiga |
|---|---|---|
| P | Prática | receita, carteira, valor da sessão, ocupação de agenda |
| S | Sujeito | quem ela atende melhor e quem a procura |
| I | Inquietação | a necessidade por trás da busca |
| Q | Qualidade | proposta de valor vs. concorrência local |
| U | Universo | cidade, cultura, canais |
| E | Estória | origem, crenças, personalidade |

Em inglês: Practice, Subject, Inner need, Quality, Universe, Ethos.

Processo em 8 passos, 2 etapas: **Estratégia** (Entrevista · Workshop · Pesquisa ·
Diagnóstico) → **Identidade** (Plataforma · Keyword · Keyvisual · Guia da marca).


## Regras que não se quebram (valem para todo agente)

1. **Artigo 20 do Código de Ética do Psicólogo / CFP**: nada de promessa de resultado
   terapêutico, agenda cheia, pacientes ou faturamento; nada de caso clínico; nada de
   imagem de sessão, paciente, criança atendida, divã, antes/depois; nada de tratar a
   profissão como "nicho lucrativo".
2. **Não inventar**: números, depoimentos, fontes, clientes, métricas, prazos, garantias.
   Afirmação normativa cita CFP/CRP com link. Sem superlativo ("o melhor", "referência",
   "nº 1") nem promessa de posição no Google (art. 20 + CDC valem para o próprio estúdio).
3. **Depoimentos**: os que existem no site são **fictícios** (gerados por IA) — **não usar
   em nenhum texto**. Prova social só com **avaliações reais do Google**, anônimas (só o
   texto da avaliação, sem nome). Nada de case ou cliente externo como prova (ver abaixo).
4. **LGPD**: legítimo interesse sobre e-mail **profissional publicado pela própria
   titular**; fonte registrada; descadastro honrado para sempre (não apagar quem saiu);
   sem base comprada, sem e-mail adivinhado. Aceite explícito em todo formulário,
   validado no servidor. Meta Pixel e embeds só com consentimento.
5. **Envio de campanha é automático** (decisão de 15/11). Campanha aprovada pelo Felipe
   (lista, oferta, texto-base) roda sozinha em rotina — D0, follow-ups e respostas do
   playbook — e reporta depois. Assina Felipe ou Leonardo, conforme a campanha. Fora do
   playbook (desconto, contrato, objeção estranha, denúncia) vai para o Felipe. LinkedIn:
   convite continua manual.
6. Só ofertar o que está ativo (site e e-book). Preço do site só no `/lp/site`, banner do
   blog e materiais de venda — nunca no `/en`. Imersão: não ofertar nem precificar.
7. **Copy aprovada não se reescreve** (`lib/institucional.ts`).
8. **Imagens reais**: banco com licença (Freepik via Magnific) ou fotos do Felipe. Nenhuma
   imagem de IA no site.
9. **Português (pt-BR)** em tudo que é público, exceto `/en`.

## Fora do harness: clientes externos e outras frentes

- O **portfólio** (`/portfolio`, `lib/portfolio.ts`) é vitrine profissional para quem
  procurar. **Não** é fonte de copy, prova, exemplo ou argumento de venda, e nenhum agente
  cita esses clientes (PrismaPay, Alves & Nabuco etc.) — não são o público da Made by Felipe.
- Trabalhos para clientes externos, agência/freela e produtos pessoais ocupam a agenda do
  Felipe, mas **não entram** no harness. Se aparecerem numa fonte (Drive, agenda, OpenBot),
  ignorar.
