# Consolidação — uma porta só, mínimo atrito

_Decisão de 15/11/2026. Objetivo do harness: o Felipe parar de gerenciar provedora de IA e
ferramenta secundária, e parar de viver com 30 abas abertas._

## Princípios

1. **Uma porta só.** Uma janela de chat (Central) + o WhatsApp. Abriu, falou, a triagem
   decide o resto. Nada de escolher agente, modelo ou modo (`triagem.md`).
2. **Voz primeiro.** Áudio é o jeito principal de entrar: o Felipe fala, descarrega ideia,
   e a IA executa. Quanto mais ele fala, mais contexto a IA tem. Texto é opcional.
3. **Ele não executa.** Ele descarrega; agentes executam; rotinas rodam sozinhas e
   reportam depois.
4. **Uso pessoal, não é produto.** Nada aqui será vendido ou oferecido a terceiros.
5. **Tudo pelo CLI, na assinatura.** Modelo pelo Claude Code CLI logado na assinatura do
   Felipe (headless na VPS, como o OpenBot já faz). Ferramentas também por CLI sempre que der
   (`gh`, `git`, `curl` no Twenty, scripts SMTP/IMAP). Sem chave de API por padrão, sem
   painel novo de provedora.
6. **Menos sistemas.** Cada ferramenta nova tem de tirar abas, não somar.

## Inventário: o que roda hoje e para onde vai

| hoje | onde | destino |
|---|---|---|
| Cold mail (Dylan, 7 janelas) | OpenBot | harness/MVP (ou Sellbird, se ganhar a avaliação) |
| Reposição de leads (Quinn, sexta) | OpenBot | harness/MVP |
| Blog (Casey, 00:30 e 03:00) | OpenBot | harness/MVP |
| Prévia de site (Tyler, sob demanda) | OpenBot | harness/MVP (skill `rascunho-site-gratis`) |
| Resumo do dia / avisos no WhatsApp (Harbinger) | OpenBot + Evolution API | Central + WhatsApp |
| Reset de tokens 05:30 | tarefa agendada do Claude | rotina do harness |
| Crons do site (disparo, webinar) | Vercel | apagar (legado) |
| Rotinas de clientes externos | OpenBot / Claude | fora do harness (ficam onde estão) |

Migrar **uma rotina por vez**: roda em paralelo uma semana no destino, compara o resumo do
dia, desliga a antiga.

## Sellbird (em avaliação pelo Felipe)

O que se sabe pelo Felipe: usa a assinatura de IA dele para fazer o que já é feito hoje,
com mais funcionalidades. Não foi possível confirmar nome nem recursos por busca (15/11).

Para decidir entre **Sellbird**, **harness próprio** ou **ficar no OpenBot**, cada um
responde:

| critério | pergunta |
|---|---|
| Assinatura | roda com a assinatura do Felipe pelo CLI, sem chave de API e sem cobrança extra por uso? |
| Abas | tira quantas ferramentas da rotina? Soma alguma? |
| Voz | aceita áudio (WhatsApp ou app) como entrada principal? |
| Autonomia | campanha aprovada roda sozinha e reporta depois? |
| Caixas | envia pelas caixas Hostinger (SMTP/IMAP), com cota por janela e por dia? |
| CRM | lê e grava no Twenty? |
| Regras | dá para impor art. 20, LGPD, descadastro e a oferta atual? |
| Dados | onde ficam os leads? Dá para sair levando tudo? |
| Custo | quanto custa por mês além da assinatura? |

Se o Sellbird cobrir vendas bem, o harness fica com o resto (site, blog, triagem,
feedback, contexto) e só integra.

## MVP (o mínimo que já tira abas)

1. **Chat + áudio + triagem** numa página só, no celular (Central fase 1).
2. **WhatsApp** como segunda porta (áudio entra, resumo sai).
3. **Rotinas** lidas e ligadas/desligadas dali (começando pelo reset e pelo resumo do dia).
4. Banco de contexto = este repositório.

Pronto quando o Felipe passa um dia inteiro sem abrir OpenBot, painel da Vercel, CRM ou
outra aba para operar o harness.
