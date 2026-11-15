# Rotinas (OpenBot)

> ⚠️ **Snapshot de 14/11/2026, feito pelo Harbinger.** Pode estar defasado. Onde discordar
> dos arquivos da raiz, vale `decisoes.md` (o mais recente). Já mudou desde então: preço do
> site agora é R$ 599 / R$ 1.999 até 12x; rastreio de clique e diagnóstico descartados;
> clientes externos fora do harness.

Levantamento em 14/11/2026. Horários em Brasília. Todas rodam no OpenBot; cada execução começa sem memória do chat, por isso as instruções são longas e autocontidas.

## Resumo

| # | Rotina | Agente | Quando | Status | Frente |
|---|---|---|---|---|---|
| 1 | E-mail E1 | Dylan | seg a sex 05:30 | ativa | Vendas |
| 2 | E-mail E2 | Dylan | seg a sex 07:30 | ativa | Vendas |
| 3 | E-mail E3 | Dylan | seg a sex 09:30 | ativa | Vendas |
| 4 | E-mail E4 | Dylan | seg a sex 12:00 | ativa | Vendas |
| 5 | E-mail E5 | Dylan | seg a sex 14:00 | ativa | Vendas |
| 6 | E-mail E6 | Dylan | seg a sex 16:00 | ativa | Vendas |
| 7 | E-mail E7, resumo do dia (sem envio) | Dylan | seg a sex 19:30 | ativa | Vendas |
| 8 | Reposição semanal de leads para o cold mail | Quinn | sexta 10:00 | ativa | Vendas |
| 9 | Pesquisa Instagram DM e aquecimento | Dylan | uma vez, 11/11 09:00 | **pausada** (já rodou) | Vendas |
| 10 | Blog madebyfelipe.com.br, rodada A (até 5 artigos) | Casey | diária 00:30 | ativa | Blog |
| 11 | Blog madebyfelipe.com.br, rodada B (até 5 artigos) | Casey | diária 03:00 | ativa | Blog |
| 12 | Blog: ampliar os 3 posts mais curtos | Casey | diária 05:30 | **pausada** | Blog |

Sem rotina própria: Tyler, Taylor, Cameron, Morgan, Jason, Parker, Avery, Jordan.
Rotinas de clientes externos (13 e 14 no levantamento original) saíram deste harness em 15/11.

---

## Vendas: cold mail (Dylan, rotinas 1 a 7)

Todas seguem o `EMAIL-PLAYBOOK.md` (na pasta `outreach` do Dylan), seções 7 e 8 valendo sobre as anteriores. Só usam scripts bash (sem navegador, WhatsApp ou Instagram).

Ordem fixa de cada janela de envio (E1 a E6):
1. Ler e tratar respostas das caixas A, B e (se existir o arquivo `dazz.ativo`) C.
2. Follow-ups devidos (FU2 primeiro, depois FU1), sempre pela mesma conta que mandou o D0.
3. D0 novos, só para quem aparece em `queue-email.sh`; primeiro pela conta C até a cota, depois A e B alternando.
4. Registrar cada envio no CRM; 2 a 4 minutos entre envios; parar conforme as regras do playbook.
5. Silêncio se não houve atividade.

Cotas (decisão do Felipe em 14/11), D0 + follow-ups somados:
- Conta C (contato@dazzmarketing.com.br): até 7 por janela e 40 por dia.
- Contas A (leonardo@madebyfelipe.com.br) e B (contato@madebyfelipe.agency): até 2 por janela e 10 por dia cada.
- Máximo 60 por dia no total. Fim de semana e feriado: nada.

E7 (19:30) não envia nada: trata respostas, confere se cada pessoa contatada no dia tem nota, etapa e caixa corretas no CRM, roda o benchmark (`campanha-email/dia-AAAA-MM-DD.md` e o acumulado), escreve um resumo de 3 a 6 linhas e envia ao Harbinger. O resumo traz enviados por caixa, respostas, recusas/SAIR, bounces, teste A/B, alertas, fila restante e o que precisa do Felipe.

## Vendas: reposição de leads (Quinn, rotina 8)

Sexta 10:00. Mede a fila (`queue-email.sh | wc -l`). Meta: 150 elegíveis; se já há 150 ou mais, não pesquisa. Senão, repõe (150 menos N) leads, no máximo 150 por execução, gravando direto no CRM Twenty. Alvo: psicólogas e clínicas de psicologia com CRP visível, **sem site próprio**, com e-mail profissional publicado pela própria pessoa. Regras de custo do Apify em `apify-leads.md` (teto de US$ 5 por ciclo, sempre com `maxTotalChargeUsd`). Não usa o Instagram logado da Made by Felipe (a conta já foi bloqueada uma vez). Nada é enviado por ela. Reporta ao chat, ao Dylan e ao Tyler.

## Blog madebyfelipe.com.br (Casey, rotinas 10 a 12)

- **Rodadas A (00:30) e B (03:00):** juntas até 10 artigos novos e longos por dia, em pt-BR, com capa, em um pull request para a branch `beta` do repositório `madebyfelipe/lpfds`, com merge na `beta` (que publica em Produção na Vercel). Só artigos novos. Fluxo: clonar e resetar a beta, ler o guia `blog-escrita.md`, pegar as 5 primeiras pautas da Fila em `blog-pauta.md`, pesquisar a SERP, escrever, gerar capa (API Magnific, foto sem pessoas), rodar build, `tsc`, contagem de palavras e verificação de acessibilidade (axe), abrir o PR, passar pela "trava de Produção" (confere de qual branch é o deploy atual antes de dar merge), conferir o deploy, atualizar a pauta e avisar o Tyler.
- **Ampliar posts curtos (05:30):** pausada. Estendia os 3 posts abaixo do padrão longo.
- Regras editoriais não negociáveis: art. 20 do Código de Ética do psicólogo e Resolução CFP 10/2005 (sem preço, promessa de resultado, superlativo, depoimento de paciente ou foto de criança). Nada de números ou fontes inventados.

## Como criar ou alterar uma rotina
Peça ao Harbinger, ou ao agente dono, com horário, o que fazer e quando ficar em silêncio. Rotinas agendadas existem só no OpenBot.
