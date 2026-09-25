## MODIFIED Requirements

### Requirement: Visualização de transportadoras globais
O sistema SHALL exibir ao seller, em modo somente leitura, as transportadoras globais ativas com nós de categoria, limites e faixas, indicando para cada uma se está ativada na loja, com a ação de ativar ou desativar.

#### Scenario: Seller acessa a lista de transportadoras
- **WHEN** o seller abre `/seller/transportadoras`
- **THEN** o sistema lista as globais ativas, cada uma marcada como ativada ou não na loja, e separadamente as transportadoras próprias da loja

### Requirement: Upload da tabela de frete própria da loja
O sistema SHALL permitir que o seller envie a tabela de frete das transportadoras próprias da loja no mesmo formato, validação, preview e substituição do upload do admin, com as faixas associadas à própria loja. O seller SHALL não poder enviar tabela para transportadora global.

#### Scenario: Seller sobe tabela de transportadora própria
- **WHEN** o seller envia uma planilha de faixas para uma transportadora da própria loja e confirma o preview
- **THEN** as faixas substituem a tabela anterior daquela transportadora e ficam visíveis só para a loja do seller e para o admin

#### Scenario: Seller tenta subir tabela de global
- **WHEN** o seller seleciona uma transportadora global no upload
- **THEN** a opção não está disponível e a gravação é recusada se tentada diretamente

## REMOVED Requirements

### Requirement: Sobrescrita de faixa de transportadora global
**Reason**: Decisão do PRD 049 (24/09/2026): o override por faixa torna ambíguo qual preço vale quando o admin atualiza a tabela global. Em produção não há faixa sobrescrita (0 faixas em 24/09/2026).
**Migration**: O seller que quer outro preço cadastra uma transportadora própria (por exemplo, "Transportadora Y (minha)") com a própria tabela e desativa a global na loja.
