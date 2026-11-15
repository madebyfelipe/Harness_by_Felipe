# Memória dos agentes

Uma estrutura para eles **lembrarem e crescerem**, no espírito do Hermes Agent:
memória durável + habilidades que nascem do trabalho + revisão que consolida.

## Como funciona

| peça | onde | o que faz |
|---|---|---|
| Memória durável | `memoria/<agente>.md` | fatos estáveis, lições de erro e preferências do Felipe; entra no prompt do agente a cada execução |
| Ferramenta `lembrar` | chat | o próprio agente grava uma lição (sem cartão; fica registrado) |
| Ferramenta `minha_memoria` / `esquecer` | chat | reler o que já aprendeu e apagar o que ficou defasado |
| Revisão automática | `ui/lib/learning.ts` | ao fim de execução longa (6+ ferramentas) ou com erro, um Haiku lê o pedido, o resultado e as ferramentas e grava até 3 lições; no máximo a cada 20 min por agente |
| Curador semanal | `routines/curador-de-memoria.yaml` | junta repetidas, enxuga e promove lição procedural repetida a habilidade em `skills/<slug>/SKILL.md` |

## Regras da memória (valem para agente e para a revisão)

- Só entra o que **muda o próximo trabalho**: fato estável, lição de erro, preferência do Felipe.
- Não entra: resumo de conversa, coisa que o banco de contexto já diz, segredo, dado pessoal de lead.
- Frase curta, uma ideia por linha. Teto: 80 linhas por agente (a revisão e o curador cortam).
- Repetida 2+ vezes vira habilidade; aí a memória guarda só "ver skill <slug>".
- Apagar é normal: `esquecer` ou o curador.

## Formato

```md
# Memória — programador

_Linha de contexto._

- (fato) O deploy do lpfds sai pela branch `beta` — 15/11
- (licao) Testar `next build` antes de push na `beta`; o Vercel não avisa — 15/11
- (preferencia) Resposta curta, sem jargão — 15/11
```

## Autonomia

No cabeçalho do agente (`agents/<nome>.md`):

```yaml
autonomia: assistido   # padrão: escrita e terminal pedem cartão
autonomia: livre       # o que o classificador já considera seguro roda sem cartão (registrado)
autonomia: consultivo  # só lê e responde; não escreve, não roda comando, não delega
```

`livre` não abre a porta para tudo: segredo continua bloqueado, comando de risco continua
pedindo cartão e tudo fica na tela de Registros.
