# Feedback do Felipe (loop de uso)

_Decisão de 15/11/2026. Muita coisa só aparece no uso e se perde até a hora de registrar.
O loop serve para capturar a impressão na hora, sem formulário longo._

## Como registrar (do mais rápido ao mais completo)

1. **WhatsApp**: mensagem começando com `fb:` para o Harbinger/orquestrador.
   Ex.: `fb: resumo do Dylan veio longo demais`, `fb: o rascunho de site ficou genérico`.
   Pode ser áudio. Quem recebe registra aqui e responde só "anotado".
2. **Janela de feedback na Central** (quando existir): botão fixo em toda tela e em cada
   entrega de agente, com 3 toques (`bom` · `ruim` · `comentar`) e campo livre opcional.
   Grava automaticamente onde estava (tela, agente, rotina, entrega).
3. **Direto neste arquivo** (sessão do Claude): "anota como feedback: …".

## Formato de cada registro

```
- <data> · <onde: agente/rotina/tela/entrega> · <bom|ruim|ideia> · "<o que o Felipe disse>"
  → <encaminhamento: regra nova | cartão no Trello (M<n>) | ajuste feito | descartado (por quê)>
```

Registrar as palavras do Felipe como ele disse. O encaminhamento é preenchido na triagem.

## Triagem (rotina semanal, dom 20:00, junto do resumo da semana)

- Agrupa os registros sem encaminhamento.
- Para cada um: vira **regra** (entra no arquivo certo e em `decisoes.md`, com data),
  **cartão** no milestone certo (`milestones.md`), **ajuste** já feito, ou **descartado**.
- Repetido 2+ vezes = prioridade.
- Manda ao Felipe 3–5 linhas: o que virou regra, o que virou tarefa, o que precisa dele.

## Registros

- 14/11/2026 · Central · tela / · Chat · Central · ideia · "pode arredondar mais as bordas, está tudo muito quadrado, deixar mais agradável de olhar, etc"
  → ajuste feito em 15/11: Central com raio 10px (cartões 16px, caixa de mensagem e bolhas mais macias, pontos redondos). O site segue com 2px.
- 15/11/2026 · Central · chat · orquestrador Haiku 5.5 · 'teste' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
- 15/11/2026 · Central · chat · orquestrador Haiku 5.5 · 'teste' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
- 15/11/2026 · Central · chat · orquestrador Sonnet 5.5 · 'quais repos vc tem acesso da minha conta??' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
- 15/11/2026 · Central · chat · orquestrador Sonnet 5.5 · 'quais repos vc tem acesso da minha conta??' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
- 15/11/2026 · Central · chat · triagem Haiku 5.5 · 'planejar: quero fazer um teste de delegação, preciso que um ' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
- 15/11/2026 · Central · chat · ruim · "Não fica muito claro qual é a gestão dos agentes: ao planejar uma tarefa, não consigo ver a interação dos subagentes nem o que está sendo feito em background."
  → cartão em Entrada (M3, prioridade: repetido 3x) em 15/11: ver delegação e trabalho em segundo plano na hora de planejar. Abas de subagentes e painel Tasks (15/11 tarde) cobrem parte; o último registro veio depois delas.
- 15/11/2026 · Central · chat · ruim · "Não fica muito claro qual é a gestão dos agentes: ao planejar uma tarefa, não consigo ver a interação dos subagentes nem o que está sendo feito em background."
  → cartão em Entrada (M3, prioridade: repetido 3x) em 15/11: ver delegação e trabalho em segundo plano na hora de planejar. Abas de subagentes e painel Tasks (15/11 tarde) cobrem parte; o último registro veio depois delas.
- 15/11/2026 · Central · chat · ruim · "Não fica muito claro qual é a gestão dos agentes: ao planejar uma tarefa, não consigo ver a interação dos subagentes nem o que está sendo feito em background."
  → cartão em Entrada (M3, prioridade: repetido 3x) em 15/11: ver delegação e trabalho em segundo plano na hora de planejar. Abas de subagentes e painel Tasks (15/11 tarde) cobrem parte; o último registro veio depois delas.
- 15/11/2026 · Central · chat · orquestrador Sonnet 5.5 · 'suba o sellbird na vps, versão github' · bom · "bom"
  → descartado na triagem de 15/11: sinal positivo, sem ação (resposta curta e direta agradou; já é a regra).
