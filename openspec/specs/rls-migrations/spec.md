# RLS e Migrations (Infraestrutura de Dados) Specification

## Purpose
Regras transversais de segurança de dados (Row Level Security) e disciplina de migrations do Supabase, aplicáveis a todo domínio funcional deste projeto. Fonte: skills `rls-seguranca`, `migrations-industria24`.

## Requirements

### Requirement: Negar por padrão em toda tabela nova
O sistema SHALL nascer com RLS ativado e sem nenhuma policy em toda tabela nova, liberando acesso explicitamente só quando houver regra documentada — nunca replicar o padrão aberto do Bubble legado (Data API expõe tudo).

#### Scenario: Nova tabela criada
- GIVEN uma migration criando uma tabela nova
- WHEN a tabela é criada
- THEN RLS já vem ativado e sem nenhuma policy até uma regra ser documentada e implementada

### Requirement: Escrita privilegiada só via service role em rota server-side
O sistema MUST executar qualquer escrita privilegiada (ex.: carimbo de aceite de termos) através de rota server-side usando service role, nunca expondo essa chave no client.

#### Scenario: Carimbo de aceite de termos
- GIVEN um comprador aceitando os Termos do Mercado Futuro no checkout
- WHEN o carimbo de aceite é gravado
- THEN a gravação usa service role numa rota server-side, sem a chave nunca aparecer no client

### Requirement: Policy testada antes de confiar nela
O sistema SHALL ter toda policy de RLS testada com simulação real de usuário (`supabase db query --linked` + `set_config('request.jwt.claims', ...)`), não apenas revisada por leitura.

#### Scenario: Nova policy de RLS
- GIVEN uma policy de RLS recém-escrita
- WHEN ela é validada
- THEN é testada simulando um usuário real via `set_config`, não apenas lida e aprovada visualmente

### Requirement: Numeração de migration sem colisão
O sistema MUST verificar colisão de número de migration (`git log --all` + `ls | grep -oE '^[0-9]{4}' | sort | uniq -d`) antes de criar uma nova migration e novamente antes do push/PR — colisão já quebrou o CI três vezes.

#### Scenario: Duas sessões criam migration no mesmo número
- GIVEN duas sessões de trabalho paralelas criando migrations
- WHEN uma delas está prestes a dar push
- THEN a checagem de colisão roda de novo antes do push, mesmo que já tivesse sido checada no início da sessão

### Requirement: "Aplicada" só é fato com o objeto confirmado no schema
O sistema SHALL confirmar que uma migration foi de fato aplicada em produção verificando o objeto real via `to_regclass`/`information_schema`, nunca confiando apenas em `supabase migration list` (já mentiu sob drift).

#### Scenario: Migration testada antes de rodar contra dado real
- GIVEN uma migration com DDL/DML sobre tabela com dado real em produção
- WHEN a mudança é preparada
- THEN é testada primeiro dentro de `begin; <sql>; select <verificação>; rollback;` antes de aplicar de fato

### Requirement: Dados/tipos sensíveis exigem revisão extra
O sistema SHALL exigir revisão extra antes de merge para qualquer código que toque `Cards`, `CardTime`, `credenciaisAPIs`, chave PIX ou dados bancários do lojista.

#### Scenario: PR toca campo de chave PIX
- GIVEN um PR que altera código relacionado à chave PIX do lojista
- WHEN o PR é aberto
- THEN passa por revisão extra antes do merge, além da revisão padrão

### Requirement: Segredo em texto puro nunca é aceitável
O sistema MUST NOT permitir segredo em texto puro em código, doc, commit, log ou export do Bubble — ao encontrar um, o procedimento é parar, avisar e recomendar rotação, nunca seguir em frente.

#### Scenario: Segredo encontrado em um doc
- GIVEN um segredo em texto puro encontrado durante o trabalho em qualquer arquivo do repositório
- WHEN isso é detectado
- THEN o trabalho para, o achado é avisado, e a rotação do segredo é recomendada — nunca se segue em frente ignorando

## Known Gaps
- Pendências conhecidas de rotação: PAT Supabase exposto (CrewAI Studio) e token Bubble; ~10 segredos em texto puro em configs mapeados no hardening de 21/07 (PR #72) ainda não totalmente resolvidos.
- DMARC/DKIM no Resend pendente.
