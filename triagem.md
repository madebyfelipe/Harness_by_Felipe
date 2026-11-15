# Triagem automática ("auto mode") — especificação

_Decisão de 15/11/2026. Para desenvolver no harness novo (Central). Agente:
`agents/triagem.md`._

## O que é

O Felipe manda uma tarefa em uma frase ("preciso subir uma página nova de termos de
privacidade"). Um **Sonnet 5.5** faz a triagem: entende o pedido, levanta o que precisa ser
feito, mede a complexidade e devolve um **workflow** — quais passos, qual agente e qual
modelo em cada um, onde entra revisão automática. Depois disso o workflow roda.

A triagem **não executa a tarefa**. Ela só decide quem faz e como. Por isso é barata
(Sonnet, só leitura) e rápida.

## Modos

| modo | o que acontece | quando |
|---|---|---|
| **Auto** (padrão) | triagem → mostra o plano em 3 linhas → **já executa**. O Felipe pode parar a qualquer momento | quase sempre |
| **Planejar** | triagem → mostra o workflow completo → espera o "vai" | quando ele pede, ou quando a triagem marca **decisão do Felipe** |

No modo Auto, a execução só para antes de começar se o workflow tiver um passo da lista
"decisão do Felipe" (oferta, preço, campanha nova, gasto, depoimento, apagar dado). Nesse
caso o resto do workflow pode rodar e só aquele passo espera.

## Passo a passo da triagem

1. **Entender**: reescreve o pedido em 1 frase de objetivo + o critério de pronto.
2. **Levantar o estado atual** (só leitura, rápido): o que já existe? Ex.: a página já
   existe? Em que branch está? Tem decisão sobre isso em `decisoes.md`? Tem milestone aberto?
3. **Quebrar em passos** (3–8): cada passo com entrega verificável.
4. **Classificar cada passo** pela tabela de complexidade abaixo.
5. **Escolher agente e modelo** de cada passo (tabela de roteamento).
6. **Encaixar as checagens**: `guardiao` em todo texto que sai, `qa-site` em toda mudança
   no site.
7. **Estimar custo**: tamanho (P/M/G) e se cai na janela de uso da assinatura ou em chave
   de API.
8. **Devolver o workflow** no formato fixo (abaixo).

## Complexidade (nota de 1 a 4)

Pontue cada eixo de 0 a 2 e some:

| eixo | 0 | 1 | 2 |
|---|---|---|---|
| **Escopo** | 1 arquivo / 1 registro | algumas partes de um sistema | vários sistemas (site + CRM + OpenBot) |
| **Ambiguidade** | pedido fechado | precisa de 1–2 suposições | precisa desenhar a solução |
| **Gosto / julgamento** | mecânico | texto ou layout simples | copy de oferta, design, estratégia |
| **Risco** | reversível e interno | público mas fácil de desfazer | legal (CFP, LGPD), dinheiro, envio em massa, dado de lead |
| **Contexto exigido** | o pedido basta | 1–2 arquivos do harness | muitos arquivos + histórico |

| soma | nível | quem faz |
|---|---|---|
| 0–2 | **N1 · trivial** | executor direto em **Haiku 5.5** ou **Sonnet 5.5**, sem orquestração |
| 3–5 | **N2 · padrão** | executor **Sonnet 5.5** + checagem (guardião/QA) |
| 6–7 | **N3 · delicado** | **Opus 5.5** planeja ou escreve a parte delicada, **Sonnet 5.5** executa o resto, checagem |
| 8–10 | **N4 · projeto** | **Fable 5.2** orquestra, vários executores, vira milestone no Trello |

Regras que sobem o nível independentemente da soma:
- Risco 2 → no mínimo N3 na parte de risco.
- Gosto 2 em copy de oferta ou design do site → Opus ou Fable naquela parte.
- O Felipe já disse "não ficou bom" numa tarefa parecida (ver `feedback.md`) → começa um
  degrau acima.

## Roteamento (domínio → agente)

| domínio | agente | modelo padrão |
|---|---|---|
| mexer no site (página, componente, post, correção) | `programador` | Sonnet → Fable |
| verificar site | `qa-site` | Sonnet |
| texto que sai (e-mail, página, post) | quem escreve + `guardiao` | Sonnet + Haiku |
| leads, captação | `pesquisador-leads` / Quinn (OpenBot) | Sonnet |
| campanha de e-mail | `redator-vendas` / Dylan (OpenBot) | Sonnet |
| preço, oferta nova | `analista-mercado` | Sonnet → Fable |
| pergunta sobre o negócio | modo Contexto (só leitura) | Haiku/Sonnet |
| projeto grande, mais de um domínio | orquestrador | Fable |
| não encaixa | nova skill/agente? A triagem sugere e pergunta | — |

Se o OpenBot já tem um dono para aquilo (Dylan, Quinn, Casey), a triagem manda para lá
em vez de duplicar.

## Formato de saída (fixo)

```yaml
pedido: "<frase do Felipe>"
objetivo: "<1 frase>"
pronto_quando: ["<critério verificável>", ...]
estado_atual: "<o que já existe, 1–3 linhas>"
complexidade: { escopo: 0-2, ambiguidade: 0-2, gosto: 0-2, risco: 0-2, contexto: 0-2, soma: n, nivel: N1-N4 }
modo: auto | planejar
decisao_do_felipe: [] # passos que esperam por ele; vazio = roda tudo
passos:
  - n: 1
    o_que: "<entrega verificável>"
    agente: programador
    modelo: claude-sonnet-5-5
    por_que_esse_modelo: "<1 linha>"
    checagem: qa-site
custo: { tamanho: P|M|G, onde: assinatura|api }
suposicoes: ["<o que a triagem assumiu sem perguntar>"]
```

Para o Felipe (WhatsApp/Central), a triagem resume em até 3 linhas:
`N2 · programador (Sonnet) + qa-site · ~M · rodando. Assumi: <suposição>.`

## Exemplo: "preciso subir uma página nova de termos de privacidade"

- **Estado atual:** o site já tem `/privacidade`, `/cookies` e `/termos`. Então é **atualizar**
  a página, não criar outra. Dados legais vazios em `lib/legal.ts` (razão social, endereço).
- **Complexidade:** escopo 1 · ambiguidade 1 (página nova ou atualizar?) · gosto 0 ·
  risco 2 (LGPD, texto legal público) · contexto 1 → soma 5, mas **risco 2 sobe para N3**
  na parte do texto.
- **Workflow:**
  1. **Opus 5.5** revisa o texto contra a LGPD e o que o site coleta hoje (newsletter,
     LP, cookies, Meta Pixel com consentimento), sem inventar base legal.
  2. **guardiao** (Haiku) confere promessas e dados.
  3. **programador** (Sonnet) aplica em `/privacidade`, atualiza `ATUALIZADO_EM`.
  4. **qa-site** (Sonnet): build, axe nos dois temas, celular.
  5. Publica (pedido explícito vai direto para o ar) e avisa o Felipe.
- **Decisão do Felipe:** razão social e endereço para `lib/legal.ts` — se faltar, o resto
  roda e esse campo fica marcado como pendente.
- **Resumo enviado:** `N3 no texto (Opus) · programador Sonnet + QA · ~M · rodando.
  Assumi: atualizar /privacidade em vez de criar outra página.`

## Aprendizado (fecha o loop)

- Toda triagem fica registrada: pedido, nível, modelos escolhidos, resultado (passou de
  primeira? precisou subir de modelo? o Felipe deu `fb:`?).
- Na triagem semanal de feedback (`feedback.md`), olhar onde a triagem errou para mais ou
  para menos e ajustar as regras desta página, com data.
- Meta: a maioria das tarefas passando de primeira, sem o Felipe precisar dizer "refaz
  com o modelo melhor".

## Para construir (na Central)

- Botão/modo **Auto** no chat e no WhatsApp (padrão). "planejar:" no começo da mensagem
  força o modo Planejar.
- Tela mostra o workflow como lista de passos com agente, modelo e status de cada um.
- Botões: **parar**, **subir de modelo** (passo atual), **trocar agente**.
- Registro de cada triagem para o aprendizado acima.
- Milestone sugerido: entra no **M3** (Central fase 1) como critério extra, ou M3.1 logo depois.
