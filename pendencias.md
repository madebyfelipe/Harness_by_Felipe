# Pendências e riscos

_Revisado em 15/11/2026. O que já foi decidido saiu daqui e está em `decisoes.md`.
Ordem: o que custa venda primeiro._

## Precisa de decisão do Felipe

1. **Imersão**: não foi citada como produto ativo em 15/11. Confirmar se saiu de vez ou
   só está parada. Até lá, nenhum agente oferta.
2. **Avaliações do Google**: a busca não achou o perfil. Mandar o link do Perfil da
   Empresa (ou colar as avaliações) para virar a prova social anônima.
3. **Campanhas sem oferta**: `prospeccao-gringa` (310) e `site-fraco-local` (154), oferta e
   tom "a definir".
4. **40 leads PRONTO de `psico-neurodivergencia`** (do painel, agora legado): passar para o
   Dylan ou descartar?
5. **Manutenção/renovação/domínio do site**: valor indefinido (hoje "vou confirmar").
6. **Limite de 6 e-mails gratuitos por conta/dia** travou envios; a fila é quase toda de
   gratuitos.
7. **Recarregar o Apify** com teto de gasto, senão a Quinn não repõe a fila.
8. **Regra de bounce única** no playbook do Dylan (trava desligada × parada por 5%).
9. **Branch de produção**: Vercel publica a `beta`. Voltar para a `main` e aposentar a
   `beta` simplificaria "pedido explícito vai direto para o ar".

## Para executar (decisão já tomada)

| o quê | onde | decisão |
|---|---|---|
| ~~Publicar R$ 599 / R$ 1.999 na `beta`~~ | repo `lpfds` | **feito 15/11** — `/lp/site` no ar |
| ~~Atualizar `EMAIL-PLAYBOOK.md` do Dylan~~ | OpenBot | **já estava**: preço novo, 12x sem juros, sem link rastreado |
| ~~Tirar os depoimentos fictícios do site~~ | repo `lpfds` | **feito 15/11** — commit `c5617ce`, conferido no ar |
| ~~Tirar `/diagnostico` e aposentar `/api/diagnostico`~~ | repo `lpfds` | **feito 15/11** — página e API removidas, 404 no ar |
| ~~Remover rastreio de clique~~ | repo `lpfds` | **feito 15/11** — `/r`, `link-clique` e `CLIQUE_SECRET` fora |
| ~~Remover cron de disparo e de webinar~~ | repo `lpfds` | **feito 15/11** — `vercel.json` sem crons |
| Excluir os 7 agentes do jogo na interface do OpenBot | OpenBot (manual) | 14/11 |
| Conectar a conta certa do Trello e montar o quadro do harness (M0–M4) | Trello | 15/11 |

> Mexer em copy aprovada exige aval. Os depoimentos são exceção: a decisão de tirar já é
> do Felipe (15/11).

## Inconsistências conhecidas

- **Respostas de lead em dois lugares**: caixas redirecionam para o Gmail pessoal e o Dylan
  lê por IMAP. Falta fonte única de "respondeu".
- O funil vive em `people.prospStatus`; `opportunities` tem 2 registros. Falta decidir onde
  a venda fecha.
- `site-gratis-whatsapp` (a campanha ativa) não existe como objeto `campanhaProspeccao`.
- `lib/data.ts` (planos R$ 1.200–2.500) e `previews/campanhas/` (45 dias) no `lpfds`:
  ninguém usa, mas um agente pode ler e repetir.
- `lib/legal.ts` com razão social e endereço vazios (CNPJ em nome de Dazz Marketing,
  Curitiba/PR; o estúdio se apresenta de Sorocaba).
- **Janela de uso**: rotinas antes das 05:30 (blog da Casey 00:30/03:00, rotinas de
  clientes externos às 05:00) abrem a janela antes do reset. Se o OpenBot usa o login da
  assinatura, o reset cai antes das 10:30.

## Conectores / acessos faltando

- **Trello** da conta certa (o conectado aqui é outra conta).
- **OpenSEO** e **Postiz**: reconectar nas configurações de conectores do claude.ai.
- **Search Console** sem conector.
- **Gmail**: "Mail service not enabled"; a caixa real é Hostinger.
- Servidor do OpenBot não é acessível das sessões do Claude (relatório do Dylan não é lido daqui).

## Riscos

- Depoimentos fictícios no ar (até saírem do site).
- Repo `lpfds` público com BCC de e-mail pessoal (`/api/diagnostico`) e números de WhatsApp.
- DMARC do `madebyfelipe.com.br` sem `rua`.
- Fotos da home em ~736px.
- Status antigos do painel (`PESQUISAR`, `REVISAR`) misturados com os do Dylan no mesmo CRM.
