## 1. Verificação antes de mudar

- [ ] 1.1 Confirmar em produção com `supabase db query --linked`: 0 linhas em `transportadora_faixas_frete`, transportadoras globais existentes e CDs sem CEP
- [ ] 1.2 Grep por leituras diretas de `transportadoras` e `transportadora_faixas_frete` fora de RPC (client e server) e listar o que a nova RLS afeta
- [ ] 1.3 Reservar o número da migration com `scripts/proximo-migration.sh`

## 2. Schema

- [ ] 2.1 Migration: colunas novas em `transportadoras` (D1), índice único de nome por loja (D2), colunas novas em `transportadora_faixas_frete` (D1) e constraint de faixa de global sem `loja_id` (D6)
- [ ] 2.2 Migration: colunas `endereco`, `aceita_retirada`, `horario_retirada` em `centros_distribuicao` (D11)
- [ ] 2.3 Migration: tabelas `loja_transportadoras`, `transportadora_nos`, `transportadora_veiculos`, `transportadora_grade_simples`, `zonas_cep` com RLS negando por padrão e policies de dono e admin (D3, D7, D9, D10)
- [ ] 2.4 Migration: policies de leitura corrigidas em `transportadoras` e `transportadora_faixas_frete` (D7)
- [ ] 2.5 Migration: trigger que impede o seller de reativar transportadora desativada pelo admin (D8) e trigger de global obrigatória em `loja_transportadoras` (D3)
- [ ] 2.6 Migration: RPC `substituir_faixas_transportadora` com verificação de dono, sobreposição e troca atômica (D4, D5)
- [ ] 2.7 Migration: seed de `zonas_cep` (67 bairros de Manaus e 5 cidades vizinhas) (D10)
- [ ] 2.8 Testar 2.1 a 2.7 em `begin/rollback` com `db query --linked`, incluindo leitura de transportadora própria de outra loja com sessão de seller (deve voltar vazio)
- [ ] 2.9 Regenerar `database.types.ts` e conferir o diff (arquivo trunca sem token)

## 3. Regras em `src/lib/transportadoras/` (teste antes, Red→Green)

- [ ] 3.1 Parser da tabela no formato Bubble ampliado e no antigo: colunas, obrigatórios, vazios valem zero, CEP com máscara, vírgula e ponto, "Atende" = N, limite de 15.000 linhas
- [ ] 3.2 Recusa da planilha de cotação por envio pelo cabeçalho
- [ ] 3.3 Detecção de sobreposição por origem, destino e peso, apontando as linhas (D5)
- [ ] 3.4 Aviso de KgAdicional vazio no preview
- [ ] 3.5 Conversor da grade simples em faixas, com validação de limites de veículo coerentes
- [ ] 3.6 Validação do cadastro: mínimo maior que máximo, fator de cubagem obrigatório no modo avançado

## 4. Seller

- [ ] 4.1 Cadastro e edição da transportadora própria com os campos novos, nome único e motivo visível quando desativada pelo admin
- [ ] 4.2 Upload da tabela no formato novo com preview, erros por linha, sobreposição e confirmação via RPC; remover o upload de cotação por envio e a sobrescrita de global
- [ ] 4.3 Seleção de nós da taxonomia com contador de produtos cobertos
- [ ] 4.4 Grade simples por CD: veículos, zonas, avançado, "Copiar de outro CD", preview das faixas geradas
- [ ] 4.5 Lista de globais com ativar/desativar, código de cliente e aceite de contrato
- [ ] 4.6 Painel de pendências: sem faixa, produtos sem peso ou medidas, produtos sem transportadora por categoria, CDs sem CEP
- [ ] 4.7 Centro de distribuição: CEP obrigatório e validado por consulta, endereço, aceita retirada e horários
- [ ] 4.8 Baixar modelos: planilha padrão (abas Faixas, Dados da transportadora, Instruções) e "Manaus por bairro"

## 5. Admin

- [ ] 5.1 Cadastro de global com os campos novos, tabela com origem e nós
- [ ] 5.2 Data de encerramento da global; cron diário que avisa 7 dias antes e desativa na data (D12)
- [ ] 5.3 Aviso "tabela atualizada" às lojas que ativaram a global
- [ ] 5.4 Lista de transportadoras próprias de todas as lojas com desativar e motivo

## 6. Verificação e entrega

- [ ] 6.1 `npm run lint`, `npm run build` e `npm run test` verdes
- [ ] 6.2 Checklist do Milestone 1 do PRD 049 no browser com conta de seller real: CD sem CEP vira pendência; modo simples gera faixas; planilha "Manaus por bairro" sobe; sobreposição, CEP invertido e valor negativo bloqueiam; moto maior que carro não grava; admin cadastra global e o seller ativa com código; outra loja não vê a transportadora própria
- [ ] 6.3 `scripts/proximo-migration.sh --checar` antes do push; PR com `Closes #<issue>`; migration nova pede confirmação da dona antes do merge
