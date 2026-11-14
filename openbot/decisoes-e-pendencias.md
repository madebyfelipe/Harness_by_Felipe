# Decisões do Felipe e pendências

Levantamento em 14/11/2026.

## Decisões já tomadas (cronologia)
| Data | Decisão |
|---|---|
| 10/11 | Rotina editorial automática do advocacia_an continua (terça/quinta); Blake não cria posts, só arte de Instagram e SEO técnico. |
| Após 10/11 (data exata não registrada) | WhatsApp e Instagram DM de prospecção ficam pausados; canal único é o e-mail. |
| 11/11 | Envios de e-mail liberados para 12/11 com seleção mais rígida de Gmail vindo do Instagram. |
| 11/11 | Textos de DM aprovados e plano de aquecimento (envio de DM segue pausado). |
| 12/11 | Campanha v2 aprovada: D0 curto sem preço, follow-ups D+3 e D+7, teste A/B de assunto. |
| 12/11 | Artigos do blog Made by Felipe passam a ser longos; 2 rodadas por dia, até 10 artigos. |
| 13/11 | Trava de parada por bounce desligada; só relatar. |
| 13/11 | Produção do site Made by Felipe passa a ser a branch `beta`. Não ampliar posts antigos. |
| 14/11 | Cota de e-mail: conta C 7 por janela e 40 por dia; contas A e B 2 por janela e 10 por dia; total 60. Conta C ativada. Cópia oculta (CCO) para o alo@. |
| 14/11 | Mensagem aprovada enviada por WhatsApp (Evolution API) a uma clínica de ABA de Sorocaba, uma única vez. |
| 14/11 | Projeto de jogo, canal e equipe de game dev: apagar. |

## Pendências que precisam do Felipe
1. **Limite de e-mails gratuitos** (6 por conta por dia) travou os envios de 13/11, e as 18 linhas restantes da fila são todas de e-mail gratuito. Decidir se muda o limite.
2. **Recarregar o Apify com teto de gasto.** Sem saldo, a Quinn não repõe leads; a fila acaba em poucos dias úteis.
3. **Excluir na interface os 7 agentes do jogo** (Rex, Nova, Kai, Ada, Iris, Milo, Lyra). Não há ferramenta para o Harbinger excluir agente.
4. **Primeira tarefa do Wren** (agente de web do site Alves & Nabuco, em espera).
5. **Segurados aguardando decisão:** 154 leads com site fraco, 169 do Google Maps com site próprio e 39 leads de conteúdo/webinar sem campanha (sem evidência de serem psicólogas). Dois leads aguardam confirmação de CRP.
6. **SEO do advocacia_an:** decidir `noindex` ou diferenciar as páginas `/bio-*`; encurtar títulos de artigo; ajustar imagens sem dimensões.
7. **Manutenção, renovação e domínio:** valor não definido; sem isso a equipe só responde "vou confirmar".
8. **Campanha gringa:** depende de lista de leads do Felipe e de criação de campos novos no CRM.

## Inconsistências que valem esclarecer
- **Bounce:** o playbook diz que a trava foi desligada em 13/11, mas o Dylan parou o dia em 13/11 por 1 bounce em 8 envios (regra de 5% de uma seção anterior). Falta uma regra única.
- **Duas ofertas:** o cold mail oferece rascunho grátis de site (R$ 440 ou R$ 1.540 para publicar) e o blog fala em imersão de 2 dias, marca em 45 dias e método PSIQUE. São produtos diferentes ou o mesmo funil em etapas? Vale registrar a escada de produtos.
- **Fila:** o benchmark lista 356 pessoas com e-mail e sem optOut, mas apenas 18 passam pelos filtros de `queue-email.sh`. O número útil é o segundo.
- **Playbook:** `EMAIL-PLAYBOOK.md` tem duas seções numeradas 8 e partes antigas (cota de 40, 20 por conta) que perderam validade; o texto manda a seção 8 mais recente valer.

## O que ainda não está medido ou confirmado
- Entrega real dos e-mails (caixa de entrada x spam) e reputação do domínio (Google Postmaster não configurado; falta teste semanal de caixa de entrada).
- Entrega das mensagens de WhatsApp (a API só devolve que aceitou).
- Resultado comercial: respostas até agora são poucas (1 interessada em 13/11); não há reuniões ou vendas registradas neste levantamento.
- Se o Trello e o Notion têm conteúdo relevante: não consegui acessar (Trello pede login, Notion falhou ao conectar).
- Faturamento, preços fora os citados, clientes atuais (além de uma cliente intocável), carrosséis publicados e resultados do Instagram: não encontrei dados.
