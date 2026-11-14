---
name: validacao-de-oferta
description: Valida uma oferta de campanha (nova iniciativa, promoção, preço, público) contra a oferta principal da Made by Felipe — construção de marca e posicionamento para psicólogas — e devolve um veredito com o que ajustar. Use depois da pesquisa de preço, antes de abrir campanha ou ao criar promoção.
---

# Validação de oferta

A oferta principal é **construção de marca para psicólogas** (imersão: dois encontros de
~1h30 → diagnóstico, estudo de mercado e construção da marca → tudo apresentado em até 30
dias, com o site incluso). O site avulso é **porta de entrada e geração de caixa**. Toda
oferta nova tem de puxar para a principal, não competir com ela.

## Perguntas (responda cada uma com sim/não + uma linha)

1. **Público**: é o ICP (psicólogas, foco em quem atende famílias de crianças
   neurodivergentes) ou um teste declarado? Se teste, qual o critério de sucesso?
2. **Transformação, não entregável**: a oferta vende o resultado para o negócio
   (posicionamento, marca pessoal, aumento de ticket, ser escolhida antes de comparar
   preço) ou vende peça avulsa (página, logo, post)? Peça avulsa = commodity.
3. **Ponte**: quem compra esta oferta tem um caminho natural para a imersão? Qual?
4. **Preço**: está na faixa da `pesquisa-de-preco`? Abaixo do P25 do mercado, explique por
   que não vira "o barato".
5. **Fora do foco**: oferece social media ou tráfego pago como serviço principal? (não deveria)
6. **Ética e lei**: passa no art. 20 do CFP (sem promessa de resultado, sem preço/gratuidade
   como chamariz em material de divulgação da psicóloga), no CDC (sem promessa que não dá
   para cumprir) e na LGPD (de onde vêm os contatos)?
7. **Capacidade**: cabe na operação? (3 projetos de imersão simultâneos; quem monta os
   rascunhos de site grátis e em quanto tempo?)
8. **Consistência**: os números batem com o site atual e com as outras campanhas? Algum
   texto antigo vai contradizer?
9. **Prova**: dá para sustentar sem inventar depoimento, número ou case?

## Veredito

- **SEGUE** — todas ok.
- **AJUSTAR** — liste o que mudar (preço, promessa, público, ponte, texto).
- **NÃO SEGUIR** — falha em 2, 5, 6 ou 9.

## Saída

```
## Validação — <oferta> — <data>
Veredito: SEGUE | AJUSTAR | NÃO SEGUIR
| # | critério | ok? | nota |
Ajustes: …
Como esta oferta leva à imersão: …
Riscos: …
```

Quem decide é o Felipe. A skill recomenda; não muda briefing de campanha nem site.
