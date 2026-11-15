# Infraestrutura e integrações

> ⚠️ **Snapshot de 14/11/2026, feito pelo Harbinger.** Pode estar defasado. Onde discordar
> dos arquivos da raiz, vale `decisoes.md` (o mais recente). Já mudou desde então: preço do
> site agora é R$ 599 / R$ 1.999 até 12x; rastreio de clique e diagnóstico descartados;
> clientes externos fora do harness.

Levantamento em 14/11/2026. Nenhuma chave, senha ou token está neste documento; ficam no cofre de chaves do OpenBot (`/data/.config/OpenBot/agent-api-keys/.vault/`, só o nome da variável aparece aqui).

## Servidor
- Linux em **UTC** (Brasília = UTC menos 3; confira com `date -u -d "-3 hours" +%H:%M`; não usar `TZ=America/Sao_Paulo`, que devolve UTC).
- **Sem Python e sem jq.** Scripts são bash com curl. Node portátil em `/data/OpenBot/Shared/tools/node`; navegadores de teste em `/data/OpenBot/Shared/tools/browsers`.
- Pouca memória livre (cerca de 2,5 GB): fechar abas do navegador ao fim de cada tarefa.
- O servidor é um endereço de datacenter: sites como o Instagram bloqueiam login a partir dele (a conta @madebyfelipe.com.br já foi bloqueada uma vez). Vercel CLI também é barrada por desafio anti-robô; usa-se a API do GitHub e a Vercel MCP.

## Sistemas e para que servem

| Sistema | Uso | Acesso |
|---|---|---|
| **CRM Twenty** (crm.madebyfelipe.agency) | Único registro de leads e histórico de contato | API REST via `twenty.sh`; chave `API_CRM` |
| **Hostinger e-mail** | Três caixas de envio do cold mail e leitura de respostas | SMTP/IMAP pelos scripts em `outreach/` (senha no cofre) |
| **Evolution API** (evo.madebyfelipe.agency) | WhatsApp: envio para o Felipe, grupos e contatos aprovados | Instância `mbf`; chave `EVOLUTION_API_KEY` |
| **GitHub** | Repositório `madebyfelipe/lpfds` (site e blog Made by Felipe) | Conector GitHub do OpenBot e `gh` logado na conta madebyfelipe |
| **Vercel** | Hospeda madebyfelipe.com.br (Produção = branch `beta`) | MCP vercel; deploys conferidos pela API do GitHub |
| **Apify** | Captura de leads do Google Maps (teto US$ 5 por ciclo) | Chave `APIFY_TOKEN` |
| **Magnific** | Fotos de capa dos artigos | Chave `MAGNIFIC_KEY` |
| **Snov.io** | Aquecimento da conta C de e-mail | Fora do OpenBot |
| **cal.com/madebyfelipe/15min** | Agenda de conversas de 15 minutos | Público |
| **Google Postmaster Tools** | Reputação do domínio de envio | **Ainda não configurado** |
| **OpenBot (banco compartilhado, sites openbot.site)** | Tabelas e sites estáticos | Hoje sem tabelas criadas |

## WhatsApp (Evolution API)
- Instância `mbf` ligada ao número do Felipe. Caiu em 10/11 às 05:44 (aparelho removido, erro 401, provável conflito com WhatsApp do desktop) e já estava conectada de novo em 12/11.
- Antes de qualquer envio: `GET /instance/connectionState/mbf` deve devolver `open`. Se estiver `close` ou pedir QR, não reconectar nem usar outro canal; reportar.
- Status `PENDING` na resposta significa só que a API aceitou, não que o destinatário recebeu. Não reenviar em caso de dúvida.
- O WhatsApp Web via navegador do servidor (usado pelo Dylan no começo) saiu do ar em 10/11; o disparo por WhatsApp está pausado.

## E-mail
- Contas: A `leonardo@madebyfelipe.com.br`, B `contato@madebyfelipe.agency`, C `contato@dazzmarketing.com.br`. Toda mensagem leva cópia oculta para o alo@ do Felipe.
- Scripts em `outreach/` do Dylan: `mail.sh` (send, followup, unseen, headers, body, markseen, reply, check), `queue-email.sh`, `followup-queue.sh`, `today-count.sh`, `caixa-hoje.sh`, `crm-sent.sh`, `crm-followup.sh`, `twenty.sh`, `variant.sh` (A/B), `validate.sh`.
- Regra de ouro: a pasta Enviados é a fonte da verdade; nunca repetir envio por causa de timeout.

## Arquivos compartilhados (`/data/OpenBot/Shared`)
- `campanha-email/` (README de medição, `benchmark.js`, relatórios diários e baseline de 12/11).
- `campanha-email-v2-free-preview.md` (campanha v2: textos e entregabilidade).
- `campanha-gringa/` (copy em inglês, script de enriquecimento, prints do site em inglês).
- `apify-leads.md` (como captar sem estourar o teto).
- `coldcall-felipe-lista.txt`, `lista_limpa_disparo.csv`, `lista_excluidos.csv`, `emails_prospects_sorocaba.csv` (listas de prospecção).
- `Transfers/` (arquivos enviados pelo Felipe pelo chat: imagens, `captura_dados_maps.xlsx`, `dossie-ec141-v3.pdf`, textos colados, um zip do PCZ-PRO, o exemplo de site 1080x1350, entre outros).
- `documentacao-negocio/` (esta documentação).
- Zips prontos: `carrossel-fixados-v2.zip`, `dossie-ec141-v3-logo.zip`.

## Servidores MCP
Conectados: github, vercel, supabase, huggingface, onepagelove, computer_use. **Pedem login:** trello. **Falharam ao conectar:** cloudflare e notion.
