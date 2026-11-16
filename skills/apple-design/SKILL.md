---
name: apple-design
description: Lente de design inspirada nas Human Interface Guidelines da Apple para construir ou revisar sites, LPs e interfaces: clareza, hierarquia, tipografia, espaço, movimento com propósito, acessibilidade e modo escuro. Use junto com a skill impeccable sempre que for fazer ou melhorar um site, LP, seção ou componente visual.
---

# Apple design (para sites)

Texto próprio da Made by Felipe. As diretrizes completas pertencem à Apple e **não são copiadas
para este repositório** (ele é público). Quando precisar de detalhe de uma peça (botão, navegação,
formulário, modo escuro, movimento, acessibilidade), busque na fonte, na hora, e não guarde cópia:

- Páginas oficiais: `https://developer.apple.com/design/human-interface-guidelines/<tema>` (WebFetch).
- Resumo organizado pela comunidade (não é da Apple): `gh repo clone dickwu/apple-design-skill /tmp/apple-design-skill -- --depth 1`,
  depois leia `/tmp/apple-design-skill/SKILL.md` e só o arquivo do tema em
  `/tmp/apple-design-skill/references/hig/<tema>.md`. Pasta em `/tmp`, nunca dentro do repositório.

## Quem manda quando houver conflito

1. O pedido do Felipe e a referência visual que ele mandou.
2. O design system do site (`CLAUDE.md` do repositório do site: tokens, vermelho `#bc0319`, Neue Haas, raio, cursor).
3. A skill `impeccable`.
4. Este guia (princípios Apple).

Apple design aqui é **disciplina**, não aparência: não copiar visual da Apple nem trocar a
identidade da Made by Felipe por algo "limpo e genérico".

## Princípios que valem para site

- **Clareza antes de enfeite.** Uma ação principal por tela. Se o visitante não entende o que fazer
  em 3 segundos, a dobra falhou.
- **Hierarquia que se lê sozinha.** Tamanho, peso e espaço dizem o que importa; cor só reforça.
  Poucos tamanhos de texto, bem espaçados, com entrelinha confortável e títulos grandes sem apertar.
- **Espaço é conteúdo.** Margens generosas e ritmo constante (grade de 8). Agrupar por proximidade,
  não por caixa. Alvos de toque de pelo menos 44 px.
- **O conteúdo lidera, a interface recua.** Imagem e texto reais em primeiro plano; controle discreto.
  Material translúcido ("vidro") só onde ajuda a leitura e em poucos pontos.
- **Movimento com propósito.** Animar para explicar causa e efeito (entrada, estado, foco), com
  curva suave e duração curta. Respeitar `prefers-reduced-motion`. Nada que prenda a rolagem.
- **Acessível de verdade.** Foco visível, ordem de tabulação lógica, rótulos reais, texto que
  redimensiona, funciona só com teclado. O contraste segue o design system do site (que pode abrir
  exceção deliberada para o vermelho da marca; registrar a exceção).
- **Dois temas coerentes.** Claro e escuro com a mesma hierarquia, sem inverter cores no escuro.
- **Funciona no celular primeiro.** Conferir 390x844 antes do desktop.

## Antes de entregar

Conferir lado a lado: o que mudou, o que a referência faz que a página ainda não faz, e se a
página parece da Made by Felipe e não de um modelo pronto.
