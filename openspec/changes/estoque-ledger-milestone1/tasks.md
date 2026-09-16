## 0. Antes de escrever qualquer SQL

- [ ] 0.1 Reler a definição **vigente em produção** de `checkout_criar_pedido` com `supabase db query --linked` — a local mais recente é `0140_checkout_cotacao_uber_direct.sql`, mas há migrations `0149`–`0172` em outras branches que podem tê-la redefinido. O trigger de saldo derivado precisa conviver com a definição real, não com a local
- [ ] 0.2 Conferir colisão de número: maior em todas as branches é `0172`, então a próxima livre é `0175`. Rodar `git log --all --name-only --pretty=format: -- 'supabase/migrations/*' | grep -oE 'migrations/[0-9]{4}' | sort -u | tail -3` para confirmar que ninguém publicou `0175` nesse meio-tempo
- [x] 0.3 Baseline de produção levantado em 16/09 (`tiwdqgyeyvceaiqqwitc`): 206 produtos, 126 com saldo, 71.209 unidades, 21 lojas, **4 centros em 4 lojas**, 30 vínculos em `produto_centros` todos de centro único, **0 produtos com vários centros**, 4 `linha_itens` com `centro_id`. Números na seção "Estado real de produção" do `proposal.md`
- [ ] 0.4 Confirmar em qual branch e worktree este trabalho vai viver. ⚠ O checkout principal `web/` está sujo na branch `fix/recentes-grade-cheia` com alterações de outra sessão; não commitar por cima. Abrir worktree própria a partir de `origin/master`

## 1. Estrutura do ledger (migration `0175`)

- [ ] 1.1 Estender `centros_distribuicao` com `tipo` (`seller` | `industria`, default `seller`) e marcação de local padrão, com unicidade de um padrão por loja
- [ ] 1.2 Criar `estoque_movimentos`: produto, centro, quantidade com sinal, tipo (`entrada`, `saida`, `ajuste`, `transferencia`), motivo obrigatório não vazio, autor obrigatório, referência opcional ao pedido, data. Sem coluna de saldo na linha
- [ ] 1.3 Impor imutabilidade **no banco**: negar UPDATE e DELETE em `estoque_movimentos` para todos os perfis, inclusive `service_role`. Convenção na aplicação não conta como imutabilidade
- [ ] 1.4 Criar o saldo por produto e centro, materializado, com restrição de não negativo. Serializar escritas concorrentes sobre a mesma linha de saldo
- [ ] 1.5 Rejeitar lançamento cujo centro pertence a loja diferente da do produto
- [ ] 1.6 Índices para as duas leituras reais: saldo por produto e histórico por produto ordenado por data decrescente. Verificar contra `docs/prds/019-indices-fk-triagem-e-gatilhos-escala.md` para não duplicar padrão já decidido

## 2. Saldo derivado em `produtos.estoque_atual`

- [ ] 2.1 Trigger que atualiza `estoque_atual` como soma dos saldos do produto em todos os centros, a cada lançamento
- [ ] 2.2 Bloquear escrita direta em `estoque_atual` por fora do ledger, preservando o `CHECK (estoque_atual >= 0)` de `0022`
- [ ] 2.3 ⚠ O checkout **continua baixando direto** nesta change. Decidir e implementar explicitamente como as baixas de `0014:206`, `0018:135`, `0019:157` e `0020:159` passam a gerar lançamento correspondente sem baixar duas vezes: o caminho previsto é o trigger transformar a baixa existente em lançamento de saída, não alterar as RPCs
- [ ] 2.4 Teste do 2.3 como cenário completo: compra simulada produz exatamente um lançamento de saída e o mesmo `estoque_atual` final que produzia antes
- [ ] 2.5 Confirmar que devolução e cancelamento hoje existentes, se repõem saldo em algum ponto, geram lançamento de entrada e não reversão

## 3. Migração do saldo existente

- [ ] 3.1 Criar local padrão para toda loja sem centro; marcar como padrão o centro ativo mais antigo das lojas que já têm
- [ ] 3.2 Lançamento inicial de entrada por produto com `estoque_atual > 0`, motivo identificando a migração. Produto com vínculo a um único centro em `produto_centros` vai para aquele centro; os demais vão para o padrão da loja
- [ ] 3.3 Produto com vínculo a **vários** centros: hoje são **zero** casos em produção (baseline 0.3), então basta recusar explicitamente com erro claro em vez de ratear em silêncio. Se a contagem deixar de ser zero entre agora e a aplicação, parar e decidir a regra antes de rodar
- [ ] 3.4 Query de conferência de paridade produto a produto, exigindo zero divergências, com o resultado anexado ao PR
- [ ] 3.5 Caminho de reversão escrito e testado: remover trigger e tabelas devolve o estado anterior sem perda, válido enquanto o checkout não usar o ledger
- [ ] 3.6 Rodar a migration inteira em `begin; ... select <verificações>; rollback;` via `supabase db query --linked` **antes** de aplicar. A verificação inclui a paridade do 3.4 e o cenário de compra do 2.4

## 4. RLS e acesso

- [ ] 4.1 RLS ativa em `estoque_movimentos` e no saldo: seller lê apenas o que pertence às lojas dele
- [ ] 4.2 Gravação apenas por função `security definer`; INSERT direto pelo cliente negado
- [ ] 4.3 Teste de isolamento com dois sellers: consulta a produto alheio devolve vazio, sem revelar existência
- [ ] 4.4 Conferir contra `openspec/specs/seguranca-views-security-barrier/` antes de criar qualquer view sobre o ledger

## 5. Ajuste pelo seller

- [ ] 5.1 Campo de motivo no `ProdutoForm` (`src/components/seller/ProdutoForm.tsx:189` é o input de estoque hoje), exibido apenas quando a quantidade muda em relação à salva
- [ ] 5.2 Trocar a escrita direta por chamada da função de ajuste em `src/app/(seller)/seller/produtos/actions.ts` (hoje escreve em `:54`, `:61`, `:79` e `:204`)
- [ ] 5.3 Salvar o formulário sem mexer na quantidade não grava lançamento nem exige motivo
- [ ] 5.4 Mensagem legível quando o ajuste é recusado por motivo ausente ou por saldo insuficiente, com o disponível real

## 6. Verificação e aceite

- [ ] 6.1 Teste de concorrência: duas operações na última unidade, uma passa, outra é recusada, saldo final zero
- [ ] 6.2 Verificação de que o saldo recalculado do zero pela soma dos lançamentos bate com o materializado, para todos os produtos
- [ ] 6.3 Query de auditoria: zero lançamentos com motivo ou autor nulo
- [ ] 6.4 Vitrine, carrinho e checkout continuam lendo `estoque_atual` com o mesmo resultado de antes. Medir com cache-buster, não pela aba aberta
- [ ] 6.5 Monitoramento pós-aplicação: conferência diária de paridade entre ledger e `estoque_atual` nos primeiros 30 dias, com alerta em caso de divergência
- [ ] 6.6 Marcar o checklist de aceite do Milestone 1 no PRD 036 e levar à aprovação da dona

## 7. Fora desta change, registrar e não fazer

- [ ] 7.1 Reserva com expiração e troca da baixa no checkout — Milestone 2, change própria
- [ ] 7.2 CEP estruturado no centro, cadastro de local pelo seller, transferência e extrato — Milestone 3
- [ ] 7.3 **Bug próprio, abrir issue**: `CentroForm.tsx:26` grava `localizacao` como texto livre, enquanto 3 dos 4 registros em produção carregam JSON com `address`/`lat`/`lng` vindo do Bubble. O painel novo degrada o geocode que o legado tinha, e são justamente as coordenadas que o Milestone 3 precisa para escolher origem por distância. ✅ **A correção não exige integração nova**: `src/lib/cep.ts` já expõe `buscarEndereco` (ViaCEP) e `src/lib/geo.ts` já faz distância pela Google Routes API server-only, com erro tipado em vez de `null`. Basta o formulário pedir CEP e usar o que existe
- [ ] 7.4 **Captação, não engenharia**: o piloto de Manaus do PRD 036 começa com **zero** centros cadastrados na cidade (os 4 existentes são Rio Branco/AC ×2, Porto Alegre/RS e um endereço de Nova York que é dado de teste). Confirmar com a dona se o piloto segue em Manaus ou se muda de praça
- [ ] 7.5 Baseline das métricas do PRD 036 §5b que precisam de 30 dias **antes** da virada do Milestone 2: chamados de seller sobre estoque errado e pedidos recusados com saldo travado. Começar a contagem agora, senão não haverá como provar o ganho
