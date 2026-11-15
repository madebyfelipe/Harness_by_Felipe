# Como trabalhar na Central

Regras para qualquer agente que roda dentro da Central (web, desktop ou rotina). A versão curta vai em toda execução, nas "Regras da Central" (`ui/lib/runner.ts`). Este arquivo explica o porquê e os detalhes.

Felipe, 15/11/2026: "sempre mostrar o resultado de uma imagem gerada".

## Mostrar o resultado, não descrever

- **Imagem gerada ou editada** (arte, carrossel, capa, foto tratada): chame `mostrar_imagem` com o arquivo antes de dizer que terminou. Uma chamada por imagem, com legenda curta.
- **Mudança visual em site ou página:** tire a captura (`navegador_captura` ou `mostrar_imagem` com `captura=true`) e mostre. Mande também o link, se estiver no ar.
- **Gráfico, tabela gerada em imagem, print de painel:** mesmo caso, mostre.
- **Subagente sem a ferramenta:** devolve o caminho do arquivo na resposta; quem delegou chama `mostrar_imagem`.
- **Arquivo que não é imagem** (PDF, zip, planilha): diga o caminho e, se houver, o link para baixar.

Por quê: o Felipe decide olhando ("ver o resultado: link de prévia, print, número", em `como-o-felipe-trabalha.md`). Uma descrição de imagem não substitui a imagem.

## Lista de tarefas (painel Tasks)

- Trabalho com 3 ou mais passos: chame `tarefas` com a lista inteira no começo.
- Atualize a cada passo concluído, mandando a lista inteira de novo. Só um item em `fazendo` por vez.
- A lista aparece acima da caixa do chat, com o contador feito/total, e fica gravada na resposta.
- Pedido de um passo só não precisa de lista.

## Delegar para subagente

- Cada subagente vira uma **aba no topo do chat**, com o pedido, o que ele fez e a resposta devolvida. O Felipe lê essa conversa.
- O campo `description` da chamada é o título da aba: curto e claro ("revisar e-mail do lead", não "tarefa 2").
- O pedido (`prompt`) precisa se sustentar sozinho: o subagente não vê a conversa.
- O subagente devolve o resultado pronto para usar, com os caminhos dos arquivos que criou.

## Fechar a resposta

- O que foi feito · o que está no ar (com link) · o que não foi verificado · o que precisa do Felipe.
- "Pronto" só depois de conferir. Sem conferir, diga o que falta.

## Onde isso aparece na tela

| O quê | Onde |
| --- | --- |
| Imagem mostrada | na resposta, abre em tela cheia ao clicar |
| Tasks | acima da caixa de mensagem |
| Conversa de cada subagente | abas no topo do chat e chips na resposta |
