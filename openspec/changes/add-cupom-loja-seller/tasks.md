## 1. Schema e migration

- [x] 1.1 Checar colisão de número de migration
- [x] 1.2 Afrouxar `cupons_dono_check` para `('plataforma', 'loja')`; manter
      `check (dono <> 'plataforma' or loja_id is null)` e adicionar
      `check (dono <> 'loja' or loja_id is not null)`
- [x] 1.3 Trigger/CHECK em `cupom_regras`: para cupom de dono `loja`, `alvo`
      só pode ser `produto` ou `loja`
- [x] 1.4 RLS: policy de seller em `cupons`/`cupom_regras` (gerencia
      `dono='loja' and loja_id in (select id from lojas where owner_id =
      auth.uid())`); policy de seller em `cupom_usos` (lê usos de cupons da
      própria loja)
- [x] 1.5 Extrair `cupom_preco_regra(regras, produto_id, categoria_id,
      loja_id, preco_base) returns numeric` de dentro de
      `cupom_desconto_item`; `cupom_desconto_item` passa a chamá-la
- [x] 1.6 Testar a migration inteira em `begin; ... rollback;`

## 2. Função pura (TDD)

- [x] 2.1 Testes (red) em `cupom-desconto.test.ts`: `precoComCupomLoja`
      (nome a definir) — regra de produto, regra de loja, não-acumulação nos
      dois sentidos com faixa progressiva, sem piso (desconto pode exceder
      qualquer margem calculada)
- [x] 2.2 Implementar até verde; exportar a peça de resolução de preço
      reaproveitada do cupom de plataforma
- [x] 2.3 Espelhar em SQL (`cupom_preco_regra`), comentário cruzado

## 3. `checkout_criar_pedido` e `cupom_validar`

- [x] 3.1 No loop de linhas: se `cupom.dono = 'loja'` e `cupom.loja_id =
      v_loja`, calcular `preco_cupom` via `cupom_preco_regra` e usar
      `least(preco_faixa, preco_cupom)` como preço final da linha
      (`v_preco_unit`), gravando `desconto_cupom`/`cupom_id` para auditoria
- [x] 3.2 Confirmar que `repasse_ind`/`repasse_afiliado` são calculados sobre
      esse preço final (reaproveita o cálculo já existente pós `v_valor_item`)
- [x] 3.3 `cupom_validar`: mesmo branch, preview mostra o preço final correto
- [x] 3.4 Elegibilidade: cupom de loja só aplica se `entrega`/carrinho for da
      própria loja (natural — RPC já roda 1x por loja)

## 4. UI seller

- [x] 4.1 `src/app/(seller)/seller/cupons/actions.ts` — `criarCupom` força
      `dono='loja'`, `loja_id` da própria loja; valida alvo ∈ {produto, loja}
- [x] 4.2 `src/app/(seller)/seller/cupons/page.tsx` + editor de regras
      (reaproveitar padrão de `admin/cupons/NovoCupomForm.tsx`, com alvo
      limitado a produto/loja)
- [x] 4.3 Link no menu do seller

## 5. Verificação e deploy

- [x] 5.1 `npm run test`, `npm run lint`, `npm run build`
- [x] 5.2 Recheck colisão de migration antes do PR
- [x] 5.3 Aplicar migration em produção, regenerar types
- [ ] 5.4 Testar com cupom de loja real: SQL (`cupom_validar`/`checkout_criar_pedido`
      simulado) + clique real no checkout logado (browser-harness)
- [ ] 5.5 PR referenciando a spec anterior; confirmação do dono antes do merge
      (caminho do dinheiro)
- [ ] 5.6 `openspec archive` após deploy
