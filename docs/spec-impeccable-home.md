# Spec: passar a home pelo menu do impeccable

**Alvo:** `src/app/page.tsx` e os componentes de `src/components/vitrine/`.
**Base:** crítica de 19/09 (22/40) e o polish que a seguiu.
**Regra:** cada comando só roda se tiver achado próprio. Comando sem achado é
registrado como "sem trabalho" em vez de gerar mudança inventada.

## Situação na abertura da spec

Já rodaram e estão em produção: `init` (PRODUCT.md), `critique` (22/40),
`distill`/`harden`/`adapt`/`layout`/`colorize` parciais dentro do PR #712, e
`polish` no PR #713.

## Comandos por categoria

### Construir
| Comando | Aplica? | Escopo na home |
|---|---|---|
| `shape` | Não | Planeja superfície nova; a home existe e está em produção. |
| `init` | Feito | `PRODUCT.md` escrito em 18/09 com usuários, posicionamento e restrições. |
| `document` | Não | `DESIGN.md` existe e foi atualizado em 19/09 (exceção do roxo). |
| `extract` | Sim | `PortasEconomia`, cards e trilhos repetem valores (raio 12px, sombra do card, chip de selo). Extrair para componente/token só o que aparece 3+ vezes. |

### Avaliar
| Comando | Aplica? | Escopo |
|---|---|---|
| `critique` | Refazer no fim | Mede a nota contra os 22/40 depois das correções. |
| `audit` | Sim | Contraste real (não medido até agora), foco de teclado, ordem de tabulação, alvos de toque, CLS das imagens do carrossel. |

### Refinar
| Comando | Aplica? | Escopo |
|---|---|---|
| `polish` | Feito | PR #713. |
| `bolder` | Não | A home já é densa; ver `quieter`. |
| `quieter` | Sim | 4 trilhos horizontais seguidos, banners de terceiros com estética própria e o countdown competindo com o hero. |
| `distill` | Parcial feito | Venda Futura unificada no #712. Resta avaliar "Destaques da indústria", que repete Mercado Futuro em 2 dos 4 cards. |
| `harden` | Sim | Estados de erro e vazio ficaram no #713; falta cobrir texto longo, CEP sem cobertura, loja sem logo e nome de produto sem acento. |
| `onboard` | Sim | Primeira visita cai no portão de CEP sem explicar o que é venda futura, compra coletiva ou desconto por volume. |

### Enriquecer
| Comando | Aplica? | Escopo |
|---|---|---|
| `animate` | Sim, mínimo | Um único momento autoral (entrada dos trilhos ou do preço), respeitando `prefers-reduced-motion`. |
| `colorize` | Parcial feito | Selo de desconto em vermelho e aba de data corrigidos. Falta revisar o amarelo do botão "Comprar" contra o fundo claro. |
| `typeset` | Sim | Escala tipográfica do card (13px nome, 16px preço) e o título de seção em caixa alta com tracking, herdado do layout antigo. |
| `layout` | Parcial feito | Portas em grade e topo roxo em 2 colunas. Falta o ritmo vertical entre seções (mt-6/mt-10 alternando sem regra). |
| `delight` | Opcional | Só depois de `quieter`: a home não precisa de mais estímulo agora. |
| `overdrive` | Não | Contraria o pedido de clareza para comprador B2B. |

### Corrigir
| Comando | Aplica? | Escopo |
|---|---|---|
| `clarify` | Sim | "Mercado futuro" vs "Venda futura" como sinônimos; "Afiliar-se" dentro do card de compra; rótulo do countdown. |
| `adapt` | Parcial feito | Portas e aviso de cookies resolvidos. Falta conferir 320px e tablet. |
| `optimize` | Sim | Imagens sem `next/image` na vitrine, 73 imagens na home, sem `width`/`height` declarados. |

### Iterar no navegador
`live` e `generate` exigem servidor de dev. Ficam fora desta spec porque
dependem de escolha visual interativa da dona, não de execução autônoma.

## Ordem de execução

1. `audit` (mede antes de mexer)
2. `optimize` (peso das imagens; afeta o que o audit mede)
3. `clarify` (texto, sem risco visual)
4. `quieter` + `typeset` + `layout` numa rodada (decisões de composição se afetam)
5. `harden` + `onboard` (estados e primeira visita)
6. `extract` (só o que se repetiu 3+ vezes depois das mudanças acima)
7. `animate` (um momento só)
8. `critique` de novo, para comparar com 22/40

## Critérios de parada

- Cada etapa entra num PR próprio, com CI verde e deploy.
- Etapa sem achado real é registrada como "sem trabalho", sem commit.
- A spec termina quando a nova crítica rodar; `delight` fica para depois dela.
