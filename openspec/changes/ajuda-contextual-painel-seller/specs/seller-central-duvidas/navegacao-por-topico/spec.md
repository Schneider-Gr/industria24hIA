## Purpose

Quebra a página única do Manual do Seller em uma rota por tópico, para que cada assunto tenha link curto e direto (mandável no WhatsApp do seller) e sirva de destino do "saiba mais" de cada tela do painel.

## ADDED Requirements

### Requirement: Rota por tópico
O sistema SHALL servir cada tópico do Manual do Seller em sua própria rota, `/seller/central-de-duvidas/<slug>`, exibindo somente o conteúdo daquele tópico.

#### Scenario: Seller abre um tópico direto
- **WHEN** o seller acessa `/seller/central-de-duvidas/repasse`
- **THEN** a página mostra apenas o tópico de repasse, com navegação para o tópico anterior e o seguinte

#### Scenario: Slug inexistente
- **WHEN** o seller acessa um slug que não corresponde a nenhum tópico
- **THEN** o sistema responde com a página de não encontrado do painel, sem erro de servidor

### Requirement: Raiz como índice
O sistema SHALL exibir, na raiz `/seller/central-de-duvidas`, o índice dos tópicos com link para cada rota.

#### Scenario: Seller abre a Central
- **WHEN** o seller acessa `/seller/central-de-duvidas`
- **THEN** vê a lista dos tópicos do manual, cada um linkando para sua própria rota

### Requirement: Âncoras publicadas continuam funcionando
O sistema SHALL manter funcionais os links por âncora publicados antes desta mudança, redirecionando cada âncora para a rota do tópico correspondente.

#### Scenario: Link antigo compartilhado
- **WHEN** alguém abre `/seller/central-de-duvidas#repasse`, link publicado na versão anterior da página
- **THEN** chega ao conteúdo do tópico de repasse, sem página em branco nem erro

### Requirement: Saiba mais a partir da tela
O sistema SHALL oferecer, nas telas do painel cobertas pelo manual, um link para o tópico correspondente da Central.

#### Scenario: Seller em dúvida na tela de produtos
- **WHEN** o seller aciona o "saiba mais" em `/seller/produtos`
- **THEN** abre o tópico de cadastro de produto da Central, e não o índice geral
