---
name: pesquisa-de-preco
description: Levanta o preço praticado no mercado de uma iniciativa (por cidade, estado ou país) para o serviço que a Made by Felipe vai oferecer, calcula média/mediana por região e sugere uma faixa competitiva. Use ao abrir campanha nova (ex. prospecção gringa por estado), antes de definir ou mudar preço, ou quando o Felipe pedir "levanta o preço do mercado".
---

# Pesquisa de preço de mercado

Objetivo: dar ao Felipe um número defensável para ser **um pouco mais competitivo** que o
mercado local, sem virar commodity.

## Entrada

- Serviço comparado (ex.: site de página única para consultório; site institucional;
  identidade visual; construção de marca/posicionamento).
- Mercado: país, estados/cidades (ex.: Texas, Carolina do Norte, Arizona).
- Público (ex.: consultórios de saúde mental; psicólogas que atendem TEA).
- Moeda de saída.

## Passos

1. **Defina o escopo comparável** antes de buscar: o que entra no pacote (nº de páginas,
   SEO, Google, domínio/hospedagem, manutenção mensal?). Preço sem escopo não compara.
2. **Fontes, nesta ordem**: páginas de preço de agências/freelas locais do nicho; páginas
   de preço de agências do nicho de saúde/terapia; marketplaces e diretórios com preço
   publicado (Upwork, Fiverr Pro, Clutch, 99Freelas/Workana no Brasil); levantamentos de
   preço publicados (com data). Mínimo de **8 preços por região**; se não chegar, diga.
3. Para cada preço: fornecedor, URL, data de acesso, valor, moeda, o que inclui, se é
   "a partir de", modelo (único / mensal / parcelado).
4. **Normalize**: converta para a moeda de saída (cite a cotação e a data), separe
   pagamento único de mensalidade (mensalidade × 12 numa coluna à parte), marque "a partir de".
5. **Calcule por região**: mínimo, P25, mediana, P75, máximo. Use mediana, não média, se
   houver outlier.
6. **Faixa sugerida**: em geral entre P25 e a mediana do escopo equivalente, com
   justificativa. Mostre o efeito de ficar abaixo do P25 (sinal de barato/commodity).
7. **Cruze com a oferta principal** — chame a skill `validacao-de-oferta`.

## Saída (markdown)

```
## Preço de mercado — <serviço> — <mercado> — <data>
Escopo comparado: …
| região | n | mín | P25 | mediana | P75 | máx |
Faixa sugerida: … (por quê)
Fontes: tabela completa (fornecedor, URL, data, valor, inclui)
Não confirmado: …
```

## Regras

- Preço sem fonte não entra. Nada de estimar "deve custar uns…".
- Não publique preço em lugar nenhum: é recomendação para o Felipe decidir.
- Para os EUA, o site em inglês **não mostra preço**; a pesquisa serve para a conversa e
  para a proposta.
- Referência atual (Brasil, nov/2026): página única R$ 599, institucional R$ 1.999, até
  12x sem juros, sem mensalidade.
