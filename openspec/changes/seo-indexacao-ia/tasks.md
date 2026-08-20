## 1. Infraestrutura de indexação (código)

- [x] 1.1 Criar `src/app/sitemap.ts` puxando produtos aprovados, lojas ativas, categorias e coletivas abertas do Supabase (sem URL inventada)
- [x] 1.2 Criar `src/app/robots.ts` liberando rotas públicas e bloqueando admin/seller/afiliado/parceiro/checkout/carrinho/pedido/mensagens/login/cadastro
- [x] 1.3 Criar `public/llms.txt` com resumo estruturado do marketplace
- [x] 1.4 Validar com `tsc --noEmit` que os tipos batem com `database.types.ts` (sem campo inventado)

## 2. Metadata real das páginas de vitrine

- [x] 2.1 `generateMetadata` em `produto/[id]` (nome + descrição + preço, `status_produto = "Aprovado"`)
- [x] 2.2 `generateMetadata` em `loja/[id]` (nome + descrição + cidade/estado, via `lojas_vitrine`)
- [x] 2.3 `generateMetadata` em `categoria/[id]` (nome da categoria)
- [x] 2.4 `generateMetadata` em `coletiva/[id]` (nome do produto associado)
- [ ] 2.5 Rodar `npm run build` completo (precisa `.env.local` com credenciais Supabase reais) e conferir que as 4 rotas geram metadata sem erro em runtime

## 3. Google Search Console (ação manual do dono da conta)

- [ ] 3.1 Cadastrar propriedade de domínio `industria24.com.br` no Search Console (ver passo a passo em `design.md`)
- [ ] 3.2 Verificar propriedade via registro TXT no DNS (ou meta tag, se preferir propriedade de URL em vez de domínio)
- [ ] 3.3 Enviar `https://industria24.com.br/sitemap.xml` em Sitemaps do Search Console
- [ ] 3.4 Confirmar em "Cobertura"/"Páginas" que produtos/lojas/categorias estão sendo indexados nos dias seguintes

## 4. Palavras-chave e distribuição

- [ ] 4.1 Validar a lista de palavras-chave do `design.md` com Google Keyword Planner (exige conta Google Ads ativa com faturamento, ou modo "Descubra novas palavras-chave" sem campanha)
- [ ] 4.2 Aplicar as palavras-chave prioritárias nos H1/H2 das páginas institucionais estáticas que já têm metadata fixo (`compra-coletiva`, `seja-fornecedor`, `seja-parceiro`, `vender-como-afiliado`) — comparar copy atual com a lista antes de editar

## 5. Google Merchant Center (listagem gratuita + pré-requisito PRD 008/UCP)

- [x] 5.1 Confirmar se já existe conta Merchant Center — SIM, conta `5292116654` já existe (checado ao vivo 2026-08-19), 0 produtos cadastrados
- [ ] 5.2 Concluir GSC para `industria24.com.br` (task 3.1-3.3) — Merchant Center reaproveita a verificação de domínio do Search Console
- [ ] 5.3 Confirmar via menu lateral (não URL direta, redireciona) qual domínio está vinculado à conta `5292116654` — se não for `industria24.com.br`, revisar/corrigir antes de prosseguir; investigar também a origem dos 49 cliques/28d com 0 produtos ativos
- [x] 5.4 Implementar `src/app/feed-produtos.xml/route.ts` (RSS 2.0 Google Shopping) puxando `produtos` aprovados + `produto_imagens`, com `identifier_exists: false` (ver gap de schema em `design.md`)
- [x] 5.5 Mapear `categorias.nome` → `google_product_category` via `src/lib/google-product-category.ts` (fallback `"Business & Industrial"`; mapa por nome real fica vazio até um humano confirmar taxonomia categoria a categoria — não inventado)
- [ ] 5.6 Configurar regra de frete e vincular política de devolução (`/termos/[slug]`) existente no Merchant Center
- [ ] 5.7 Registrar `https://industria24.com.br/feed-produtos.xml` em Produtos → Feeds, agendamento diário
- [ ] 5.8 Confirmar em Configurações → Programas de listagem gratuita que a distribuição orgânica no Shopping/Search está ativa
- [ ] 5.9 Revisar Produtos → Diagnóstico nos primeiros dias e corrigir itens rejeitados
- [ ] 5.10 Registrar decisão do dono do produto sobre criar ou não Google Ads/Performance Max (fora do escopo de código desta mudança — ver `design.md`)
- [x] 5.11 `custom_label` por margem — NÃO implementado: `produtos` não tem coluna de custo/margem (confirmado em `database.types.ts`); exigiria schema novo e decisão de produto, fora do escopo sem confirmação do usuário

## 6. MCP: agente comprando em nome de um comprador autenticado

Decisão do brainstorm (2026-08-20): identidade via token de sessão do
próprio comprador — reaproveita 100% da auth/RLS que o checkout web já usa,
sem schema novo. Escopo explicitamente MENOR que o PRD 008/UCP: sem
aprovação do Google, sem Google Pay, sem waitlist.

- [x] 6.1 `mcp-server/src/checkout.ts`: client Supabase autenticado com o access token do comprador (anon key + `Authorization: Bearer`), nunca service_role
- [x] 6.2 Tool `industria24_finalizar_compra` em `mcp-server/src/server.ts`: valida o token, agrupa itens por loja, chama a mesma RPC `checkout_criar_pedido` do checkout web, devolve `pedido_ids` + link de `/pedido/{id}` para o comprador concluir o pagamento (não duplica a integração Asaas em `mcp-server` — reaproveita o retry já existente na página do pedido)
- [x] 6.3 Gate atrás do módulo `checkout` em `MCP_WRITE_ENABLED` (mesmo padrão de `catalogo`/`pedidos`) — nasce desligado
- [x] 6.4 `tsc --noEmit` do `mcp-server` limpo
- [ ] 6.5 QA manual com token de sessão real antes de ligar `MCP_WRITE_ENABLED=checkout` em produção (não testável sem `.env` real do Supabase)
- [ ] 6.6 Decidir e documentar quem pode obter/repassar o `supabase_access_token` de um comprador para um agente externo (fluxo de consentimento) — fora do escopo desta mudança, é pré-requisito de qualquer parceiro real usar o tool

## 7. Fechamento

- [x] 7.1 Rodar `npm run test` (29/29 passando) e `tsc --noEmit` (app + mcp-server) antes de abrir o PR
- [ ] 7.2 Abrir Issue no GitHub cobrindo esta mudança
- [ ] 7.3 Branch + PR referenciando a Issue (`Closes #N`) — deploy acontece via merge (pipeline Vercel), não `vercel --prod` direto deste worktree
- [ ] 7.4 Após merge e deploy: confirmar ao vivo `https://industria24.com.br/sitemap.xml`, `/robots.txt`, `/llms.txt` e `/feed-produtos.xml` respondendo 200 em produção
