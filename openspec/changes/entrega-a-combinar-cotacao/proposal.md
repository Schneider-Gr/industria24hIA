## Why

Quando não há frete calculável para o CEP do comprador, hoje o checkout mostra "CEP sem cobertura" e só resta a retirada. Com o frete por tabela (PRD 049), isso passa a acontecer em mais casos: loja sem transportadora, produto fora das categorias ou dos limites das transportadoras, CEP fora das faixas. O comprador desiste e o seller perde a venda. Esta change implementa o PRD 050 (Entrega a combinar com o vendedor): o comprador pede a cotação antes da compra, o seller responde valor e prazo, e o frete cotado entra no checkout num pagamento só, gravado no servidor.

Ao revisar o processo contra o código em 28/09/2026, apareceram quatro fatos que o PRD não previa e que mudam o desenho:

1. **Crons da Vercel rodam só uma vez por dia** (plano gratuito: todos os `crons` do `vercel.json` são diários). O lembrete de 12 h e o aviso de expiração de 24 h não cabem num cron da Vercel.
2. **O aviso de WhatsApp ao seller sai pela BubbleWhats**, que só envia: a resposta não volta para o app. A resposta em texto livre só chega pelo webhook da Meta Cloud API (`/api/bot/whatsapp/webhook`), e mensagem fria pela Meta exige template aprovado, que ainda não existe (`src/lib/whatsapp.ts`: "template configurável quando o WABA existir"). A US05 (resposta pelo WhatsApp com o Jev) fica bloqueada por isso.
3. **O frete não entra no repasse do seller** (0158). Sem o PRD 052, o seller cotaria um frete que não recebe. Por isso a entrega a combinar entra atrás de flag por loja, que só o admin liga.
4. **A origem do frete deixou de ser o CD** (D10 de `transportadoras-grandes-volumes` e D2 de `frete-tabela-checkout`): é o CEP do produto, senão o CEP da loja. O campo "CD de origem" da US04 sai; a cotação mostra a cidade e a UF do CEP de origem.

**Decisão da dona em 28/09/2026 (substitui a decisão 3 do PRD 050):** a cotação vale só para o produto em que o seller marcar "Frete a combinar" no cadastro. Ela deixa de aparecer automaticamente quando falta frete. Marcada a opção, o produto só é entregue com frete a combinar: frete grátis, tabela de transportadora, frete percentual, Uber Direct e entrega por km do afiliado (avião) ficam desativados para ele. A retirada na loja continua *(premissa: retirada não é frete)*.

## What Changes

- Tabela `cotacoes_frete_vendedor`: o pedido de cotação e a resposta, presos ao comprador, à loja, ao CEP de destino, aos itens e às quantidades, com prazo para responder (24 h) e validade da resposta (48 h). Só RPCs `security definer` escrevem nela.
- Cadastro do produto (`/seller/produtos`): opção "Frete a combinar", ao lado de "Frete grátis". Marcada, desmarca e trava o frete grátis e desativa o avião (bandas e valor por km do afiliado) daquele produto.
- Página do produto com a opção marcada: "Combine a entrega com o vendedor", com a cidade e a UF de origem e o botão "Pedir cotação de frete", quando o CEP está nas regiões do produto (sem região declarada: só a UF de origem). Nenhum outro frete é calculado nem exibido para esse produto.
- Motor de frete (tabela, percentual, Uber Direct, km do afiliado) ignora o produto com frete a combinar; no carrinho, ele vai sempre num envio próprio.
- Formulário de pedido de cotação (CEP, quantidade, observação de até 500 caracteres sem telefone, e-mail, Pix ou link), com limite de 10 por hora por comprador e um pedido aberto por comprador, loja, CEP e conjunto de itens.
- Checkout: os itens com frete a combinar formam um envio próprio (um por CEP de origem), que mostra "Pedir cotação" sem cotação válida; cotação respondida e válida aparece como "Frete combinado com o vendedor" (ou "Frete grátis combinado com o vendedor" quando R$ 0,00); se o seller respondeu também o valor do carrinho inteiro da loja, o comprador escolhe entre as duas opções.
- **BREAKING (só lojas com a flag)**: `checkout_criar_pedido` aceita a cotação do vendedor por envio, confere comprador, loja, CEP, itens, quantidades e validade no servidor, grava o frete gravado na cotação e marca a cotação como usada.
- Painel do seller: "Cotações de frete" em Operação, com contador de pendentes, resposta (valor, prazo mínimo e máximo em dias úteis, valor opcional do carrinho inteiro) ou "não entrego nesse CEP"; confirmação quando o frete passa de 50% do valor dos produtos.
- Avisos: seller por e-mail, WhatsApp (BubbleWhats, com o link do painel) e no painel; comprador por e-mail e WhatsApp na resposta, na recusa e na expiração; lembrete ao seller em 12 h.
- Agendador de hora em hora pelo GitHub Actions, chamando `/api/cotacoes-frete/tick` com `CRON_SECRET`, para o lembrete e os avisos de expiração. A expiração em si não depende do agendador: toda leitura e todo uso comparam com `responder_ate` e `valida_ate`.
- Produto ganha `frete_a_combinar` (padrão desligado), editável pelo seller no cadastro, e que não pode ficar ligado junto com `frete_gratis`.
- Loja ganha `entrega_a_combinar` (padrão desligado), que só o admin liga.

Fora desta change: resposta pelo WhatsApp interpretada pelo Jev (US05, Milestone 2 do PRD 050, bloqueada pelo template da Meta), frete no repasse (PRD 052), pós-venda do envio (M3 do PRD 049), chat livre antes da compra, classificação das mensagens do comprador pelo Jev.

## Capabilities

### New Capabilities
- `entrega-a-combinar`: pedido de cotação de frete pelo comprador, resposta do seller, uso da cotação no checkout e ciclo de vida da cotação (prazo, validade, recusa, expiração, substituição e uso).

### Modified Capabilities
- (nenhuma spec arquivada descreve o frete do checkout; `checkout-frete-tabela`, da change `frete-tabela-checkout` no PR #808, ainda não foi arquivada. O efeito sobre ela está descrito na spec desta change: o envio sem opção deixa de ficar só com retirada e passa a oferecer a entrega a combinar quando a loja tem a flag.)

## Impact

- Depende de `frete-tabela-checkout` (PR #808) para os envios, `envio_ref` e `cep_origem_produto`. Pode ser implementada antes, no caminho de loja sem a flag de tabela (a cotação cobre a loja inteira), mas o carrinho misto só existe com a #808.
- Migration nova (número pelo `scripts/proximo-migration.sh`): `cotacoes_frete_vendedor`, `produtos.frete_a_combinar`, `lojas.entrega_a_combinar` (guarda em `guard_campos_restritos`), `linha_itens.cotacao_vendedor_id`, RPCs `solicitar_cotacao_frete`, `responder_cotacao_frete`, `cancelar_cotacao_frete`, nova versão de `checkout_criar_pedido` e do overload `frete_consolidado`; `cotar_envios_tabela` (#808), `cotar_frete_tabela`, `cotar_frete_interno` e o avião passam a ignorar produto com `frete_a_combinar`.
- `src/app/produto/[id]/page.tsx`, `src/app/api/checkout/cotar-frete/route.ts`, `src/lib/checkout/opcoes-frete.ts`, `src/lib/checkout/schemas.ts`, `src/app/checkout/page.tsx`, `src/app/checkout/actions.ts`, nova `src/lib/cotacao-frete/` (regras puras + teste), nova tela `src/app/(seller)/seller/cotacoes-frete/`, `src/components/seller/ProdutoForm.tsx`, tela de lojas do admin, `.github/workflows/cotacoes-frete-tick.yml`.
- Liga em produção só depois do PRD 052 (frete no repasse). Até lá, só loja de teste com a flag.
