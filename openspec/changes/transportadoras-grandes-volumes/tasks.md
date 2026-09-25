## 1. Banco

- [x] 1.1 Migration `0199_transportadoras_grandes_volumes.sql` (D1 a D9)
- [x] 1.2 Teste em `begin … rollback` contra produção como seller real: sobreposição, nome repetido, moderação, troca de loja, apagar moderada, update de valor, religar, ativação de própria, data do aceite, isolamento entre lojas, `p_faixas` nulo, fonte `tabela_importada`
- [ ] 1.3 Tipos de `database.types.ts` para as colunas, tabelas e RPC novas
- [ ] 1.4 Aplicar em produção com confirmação da dona e conferir o schema com `db query`

## 2. Regras em `src/lib/transportadoras/` (teste antes)

- [x] 2.1 Parser de faixas no formato Bubble ampliado e antigo, recusa da cotação por envio, erros por linha, ignoradas, 15.000 linhas, aviso sem KgAdicional, CEP de 7 dígitos, milhar em R$
- [x] 2.2 Detecção de sobreposição e `paraRpc`
- [x] 2.3 Aba "Faixas" do XLSX
- [x] 2.4 Validação do cadastro
- [ ] 2.5 CEP de origem do produto normalizado (D10)

## 3. Seller

- [ ] 3.1 Cadastro e edição da transportadora própria, com motivo visível quando desativada pelo admin
- [ ] 3.2 Upload no formato novo com preview e confirmação pela RPC; remover cotação por envio e sobrescrita de global
- [ ] 3.3 Categorias por nó com contador de produtos
- [ ] 3.4 Globais com ativar/desativar, código de cliente e aceite
- [ ] 3.5 Painel de pendências
- [ ] 3.6 Modelo de planilha para download

## 4. Admin

- [ ] 4.1 Cadastro da global com os campos novos e upload pela RPC
- [ ] 4.2 Data de encerramento; cron que avisa 7 dias antes
- [ ] 4.3 E-mail "tabela atualizada" às lojas que ativaram
- [ ] 4.4 Transportadoras próprias de todas as lojas com desativar e motivo

## 5. Entrega

- [ ] 5.1 `npm run lint`, `npm run build` e `npm run test`
- [ ] 5.2 Verificação no navegador com conta de seller e de admin
- [ ] 5.3 PR com `Closes #<issue>`, migration aplicada antes do merge, deploy conferido em produção
