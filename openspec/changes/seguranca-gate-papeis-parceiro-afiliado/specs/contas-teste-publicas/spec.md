## ADDED Requirements

### Requirement: Contas de demonstração não aparecem em produção
As credenciais de contas de teste (e-mails de demo e senha compartilhada) NÃO DEVEM ser
renderizadas nem incluídas no bundle JavaScript servido em produção. O componente
`ContasTeste` DEVE ou ser removido, ou só renderizar quando o ambiente não for produção
(`process.env.NEXT_PUBLIC_AMBIENTE !== 'producao'`). A senha compartilhada de teste NÃO DEVE
constar em texto no repositório.

#### Scenario: Vitrine carregada em produção
- **WHEN** a vitrine pública é carregada no ambiente de produção
- **THEN** nenhuma lista de contas de teste nem senha compartilhada aparece na página ou no
  bundle JS entregue ao navegador

#### Scenario: Vitrine carregada em preview/staging (se o gate por ambiente for a opção escolhida)
- **WHEN** a vitrine é carregada com `NEXT_PUBLIC_AMBIENTE` diferente de `producao`
- **THEN** o atalho de contas de teste pode ser exibido, com a senha vindo de configuração de
  ambiente e não de constante no código
