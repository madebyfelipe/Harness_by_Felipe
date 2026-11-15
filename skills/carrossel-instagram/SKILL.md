---
name: carrossel-instagram
description: Monta carrossel de Instagram no estilo Made by Felipe (editorial, Neue Haas, vermelho só no destaque), em 1080x1350 (4:5), a partir de um JSON de slides. Gera os PNGs e a legenda. Use quando o Felipe pedir post, carrossel ou slides para Instagram.
---

# Carrossel Instagram (1080x1350)

Formato fixo: **1080x1350 px, retrato 4:5**. Nunca quadrado, nunca 1080x1920.

## Fluxo
1. Escreva `slides.json` (formato abaixo) e `legenda.txt` numa pasta de `saida/<nome-do-post>/`.
2. Gere: `node skills/carrossel-instagram/render.js saida/<nome>/slides.json saida/<nome>`
   (saem `slide-1.png` a `slide-N.png`; avisa se algum texto passar da margem).
3. Abra pelo menos o 1º e o último PNG e confira: texto cortado, palavra colada, vermelho demais.
4. Texto de slide e legenda passam pelo `guardiao` antes de ir ao Felipe.
5. Publicar no Instagram é ação externa: só com o Felipe dizendo, pelo `navegador_*` (login no perfil do navegador; nunca tentar senha em loop, a conta já foi bloqueada uma vez).

## slides.json
Lista de objetos. Campos (todos opcionais, menos `title`):
- `bg`: `c` claro (#f6f6f6) · `k` escuro (#151515) · `r` vermelho (#bc0319)
- `pos`: `bottom` (capa, texto embaixo) · `top` (texto logo abaixo do cabeçalho). Padrão `bottom`.
- `tag`: rótulo em caixa, maiúsculas
- `title`: título; `*palavra*` vira destaque (vermelho no claro, rosa no escuro, preto no vermelho)
- `body`: texto de apoio (Light) · `quote`: frase em destaque · `note`: linha leve · `cta`: chamada final com filete
- Exemplo completo: `exemplo-slides.json` (8 slides).

Cabeçalho automático: "Made by Felipe®" à esquerda e número do slide à direita.

## Estrutura que funcionou
1 capa (pergunta, `bg c`, `pos bottom`, "Arrasta para ver") · 2 problema (`k`) · 3 consequência (`c`) · 4 a 6 passos (alternando `r` e `c`) · 7 cuidado/regra (`c`, `top`) · 8 próximo passo + CTA (`r`, `top`). Alternar fundo a cada slide dá ritmo.

## Regras de estilo
- Cores só estas três; destaque em **uma ou duas palavras** por título. Sem gradiente, sem sombra, sem emoji, sem foto de IA.
- Caixas com borda reta (sem pílula). Fonte única: Neue Haas Grotesk Display (`fontes/`, licenciada: não publicar fora do repositório).
- Título curto (até ~8 palavras). Corpo em frase simples, sem termo técnico. Sem "não é X, é Y".
- Psicologia: sem promessa de resultado, sem depoimento, sem valor de sessão, CRP e nome completo (art. 20 CFP, ver `guardiao`).
- Só ofertar o que está ativo (site e e-book). CTA do e-book: "Quer construir a sua marca? O e-book gratuito está no link da bio."
- Legenda: título do post, 2 a 3 parágrafos curtos, pergunta para comentário, CTA, 5 hashtags no fim.

## Ambiente
`render.js` usa playwright-core e o Chromium da VPS (caminhos no topo do arquivo; troque por `PLAYWRIGHT_CORE` e `CHROME_PATH` se mudarem). Fontes vão embutidas no HTML, então não dependem do sistema.
