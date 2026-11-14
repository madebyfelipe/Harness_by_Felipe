# Pendências, inconsistências e riscos

_Encontrado durante a coleta de 14/11/2026. Ordem: o que custa venda primeiro._

## Precisa de decisão sua

1. **Oferta nova fora do ar.** Preços (R$ 599 / R$ 1.999, 12x) e formato da imersão
   (2 encontros de 1h30, até 30 dias com site) estão na `main` (`bc32cc3`, `e40f43e`), mas a
   produção publica da **`beta`**, que ainda mostra R$ 440 / R$ 1.550 e "2 dias / 45 dias".
   A sessão de 14/11 parou perguntando se leva os dois commits para a `beta`.
2. **Depoimentos** ainda dizem "dois dias de imersão" e "quarenta e cinco dias depois".
   Confirmar com as clientes ou manter como estão (são do formato antigo).
3. **Campanhas sem oferta**: `prospeccao-gringa` (310 leads) e `site-fraco-local` (154)
   estão com oferta e tom "a definir". Sem isso, ninguém pode escrever para elas.
4. **Painel pausado desde 13/11** (só o Dylan envia). 40 leads de `psico-neurodivergencia`
   estão **PRONTO** e 2 em REVISAR, parados. Retomar, descartar ou passar para o Dylan?
5. **Preço da imersão** segue sem definição (fora do site por decisão sua).
6. **Briefing da campanha `psico-neurodivergencia`** no Twenty fala de "marca e comunicação"
   sem os números novos; os textos do Dylan também precisam ser conferidos contra a oferta nova.

7. **"Merge na main = site no ar" não vale hoje.** A Vercel publica a `beta`. Para a regra
   "pedido explícito vai direto para o site" ficar simples, troque a branch de produção da
   Vercel de volta para a `main` (e aposente a `beta`). Até lá, os agentes mandam para as duas.

## Complemento: pendências levantadas pelo Harbinger (íntegra em `openbot/decisoes-e-pendencias.md`)

8. **Limite de 6 e-mails gratuitos por conta/dia** travou os envios de 13/11 (a fila restante é toda de gratuitos).
9. **Recarregar o Apify** com teto de gasto, senão a Quinn não repõe a fila.
10. **Excluir os 7 agentes do jogo** na interface do OpenBot.
11. **Primeira tarefa do Wren.**
12. **Leads segurados:** 154 site fraco, 169 do Google Maps com site próprio, 39 de conteúdo/webinar sem campanha; 2 aguardam confirmação de CRP.
13. **Valor de manutenção, renovação e domínio** do site: indefinido (hoje a resposta é "vou confirmar").
14. **Regra de bounce única:** o playbook diz que a trava foi desligada em 13/11, mas o Dylan parou o dia por 1 bounce em 8.
15. **Escada de produtos:** registrar como rascunho grátis → site → imersão se conectam.
16. **Google Postmaster** e teste semanal de caixa de entrada.

## Inconsistências encontradas

- **Rotinas editoriais [NOVO] rodam todo dia**: chamam-se "terça 05:00" e "quinta 05:00",
  mas o cron das duas é `0 5 * * *` (diário). Rodaram no sábado 14/11. Se a intenção é
  terça/quinta: `0 5 * * 2` e `0 5 * * 4`. E elas **auto-aprovam e publicam** no LinkedIn do
  Felipe sem revisão humana.
- `docs/prospeccao.md` ainda diz "sem link rastreado", mas o link `/r/<token>` foi adotado
  em nov/2026 (o `CLAUDE.md` está certo).
- `lib/data.ts` guarda planos mensais antigos (R$ 1.200–2.500) e `previews/campanhas/` um
  simulador com 45 dias. Nenhuma página usa, mas um agente pode ler e repetir.
- CNPJ ativo em nome de **Dazz Marketing Soluções de Marketing** (CNPJ do próprio Felipe,
  cadastro em Curitiba/PR); o estúdio se apresenta de **Sorocaba** e, em inglês, "based in
  São Paulo". Razão social e endereço ainda vazios em `lib/legal.ts` — dá para preencher a
  razão social já.
- **Janela de uso**: as rotinas editoriais (05:00) e o 1º bloco de e-mail (05:00) abrem a
  janela da assinatura antes do "reset" das 05:30, então o reset cai por volta de 10:00, não
  10:30. Se o OpenBot também usa o login da assinatura, ele entra na mesma conta.
- **Respostas de lead em dois lugares**: as caixas redirecionam para o Gmail pessoal, e o
  painel/Dylan leem por IMAP. Falta definir qual é a fonte única de "respondeu" para nenhum
  follow-up sair depois de uma resposta já lida.
- O funil vive em `people.prospStatus`; `opportunities` tem só 2 registros. Para medir
  venda (proposta, ganho, valor), falta decidir onde o negócio fecha.
- A campanha `site-gratis-whatsapp` (706 leads, a que mais envia) **não existe** como objeto
  `campanhaProspeccao` — briefing dela não está no CRM.
- 33–39 pessoas sem origem e sem campanha.
- ClickUp "Tarefas" tem ~100+ itens abertos, vários com prazo de 2024, misturando estúdio,
  agência e pessoal — não serve como fila confiável para um agente sem limpeza.
- Trello tem um quadro só, de 2025 — provável legado.

## Conectores / acessos faltando

- **OpenSEO** e **Postiz**: precisam reconectar nas configurações de conectores do claude.ai.
- **Gmail**: conectado mas sem serviço de e-mail nesta conta; a caixa real é Hostinger.
  Para o harness ler respostas fora do painel, precisa de IMAP no servidor (o painel já faz).
- **Search Console** sem conector (posições do blog são checagem manual).
- Servidor do **OpenBot** (`/data/OpenBot/Shared/...`) não é acessível das sessões do Claude:
  o relatório do Dylan não pode ser lido daqui.
- WhatsApp Web do servidor caiu em 14/11 (pedia QR code); o Harbinger enviou depois via
  Evolution API com status PENDING.

## Riscos

- **Repo público** com BCC de e-mail pessoal no código (`/api/diagnostico`) e números de
  WhatsApp — revisar o que precisa estar em código.
- Disparo de prospecção divide domínio com o site se cair em `alo@` (7 envios registrados
  por `alo@`). Uma onda de denúncias derruba imersão, e-book e site juntos.
- DMARC do `madebyfelipe.com.br` sem `rua` (ninguém recebe relatório).
- Fotos da home em ~736px; IA do painel nunca testada com chave real.
- Três agentes de IA escrevendo no mesmo CRM (painel, Dylan, Harbinger) com convenções
  diferentes de status (`ENVIADO` do painel × `LISTA_FRIA/PREVIA_ENVIADA` do Dylan).
