## Why

Hoje o cadastro de transportadora (`docs/prd/fluxo-frete-completo.md`, migration `0099_transportadoras.sql`) só suporta tarifa por **percentual fixo por faixa de CEP** (`faixas_cep`), sem uso de peso/cubagem real, e o cadastro é uma linha de formulário por vez — sem upload em lote. O painel legado (`industria24h.com.br/admin`, Bubble) já tinha os botões "Cadastrar Transportadoras" e "Subir Transportadoras" na tela de Entregas; o rebuild não replicou o upload. Brainstorm de 26/08/2026 (registrado em memória de sessão, `industria24h-transportadoras-tabela-frete-brainstorm-2026-08-26`) e ticket Jira KAN-137 consolidaram o desenho: importar tabelas reais de frete por transportadora (faixa de CEP destino × faixa de peso → valor), disponíveis tanto no admin (globais) quanto no seller (próprias da loja, com opção de sobrescrever linha a linha uma tabela global).

## What Changes

- Novo valor de `transportadoras.fonte`: `tabela_importada`, convivendo com `interna` (%) e `mercado_envios` — o motor % existente não é alterado nem substituído.
- Nova tabela `transportadora_faixas_frete`: `transportadora_id`, `cep_destino_inicial`, `cep_destino_final`, `peso_min`, `peso_max`, `valor`, `loja_id` nullable (`null` = faixa global do admin; preenchido = override da própria loja), RLS no mesmo padrão de `transportadoras`/`faixas_cep` (admin tudo, seller só a própria loja, leitura pública das ativas).
- **Upload 1 — cadastro em massa de transportadoras** (admin e seller): CSV/XLSX com nome/fonte/prazo, parser síncrono simples, relatório de linhas rejeitadas sem travar as válidas.
- **Upload 2 — tabela de frete de uma transportadora já cadastrada** (admin e seller): CSV/XLSX no formato da planilha modelo do usuário (CEP origem, CEP destino, Volume, Peso, dimensões, Valor declarado, Valor do Frete), processado por um loop de validação (gerar→validar→corrigir, LangGraph) que normaliza CEP e converte cada linha em uma faixa (`cep_destino_inicial=cep_destino_final`, `peso_min=peso_max=peso da linha`, salvo quando o usuário confirma agrupamento em faixas maiores no preview). Usuário revisa preview antes de confirmar o import.
- **Cálculo no checkout**: para cada transportadora com `fonte='tabela_importada'`, busca a faixa que cobre CEP destino + peso do carrinho — prioriza faixa com `loja_id` da loja do pedido sobre a faixa global equivalente (mesmo `cep_destino_inicial`/`cep_destino_final`/`peso_min`/`peso_max`); sem faixa aplicável (override ou global), cai para o cálculo `%` de `faixas_cep` da mesma transportadora/loja — a opção nunca desaparece do checkout.
- **Painel seller**: nova tela `/seller/transportadoras` — lista transportadoras globais (somente leitura das faixas do admin) e próprias da loja; botão para subir tabela própria e para sobrescrever uma ou mais faixas de uma transportadora global (grava como faixa com `loja_id` da loja).
- **Painel admin**: `/admin/transportadoras` ganha os dois botões de upload (lista + tabela de frete) e uma view das faixas importadas por transportadora.

**Fora de escopo (registrado no brainstorm, não implementado aqui):**
- OAuth/credenciais de integração de transportadora, rastreio por evento padronizado, CT-e — tema da PRD `integracao-transportadoras-tracking-cte-mercado-envios.md` (draft, decisão do dono pendente sobre prioridade).
- Roteirização/matching automático de peso real de produto — `fluxo-frete-completo.md` já registra que só 89/358 produtos têm peso confiável; a tabela importada assume o peso informado no carrinho, sem correção especulativa.

## Capabilities

### New Capabilities
- `admin-transportadoras/tabela-frete`: upload em massa de transportadoras e upload/gestão da tabela de frete (faixa CEP×peso) por transportadora, no painel admin.
- `seller-transportadoras/override-tabela-frete`: visualização das tabelas globais, upload da tabela própria da loja, e sobrescrita linha a linha de faixas de uma transportadora global, no painel seller.

### Modified Capabilities
(nenhuma — não existe spec arquivada para o motor de checkout de frete; o comportamento de fallback %→tabela é descrito nas capabilities novas acima, ver Impact para o código existente tocado.)

## Impact

- `supabase/migrations/`: nova migration para `transportadora_faixas_frete` + `fonte` check estendido em `transportadoras` (numeração a confirmar na skill `migrations-industria24` antes de criar o arquivo, para evitar colisão).
- `src/lib/checkout/opcoes-frete.ts` (já existe, do change `uber-direct-checkout-milestone1`): estender para consultar `transportadora_faixas_frete` antes do fallback `%`.
- `src/app/(admin)/admin/transportadoras/page.tsx` + `actions.ts`: novos botões e handlers de upload.
- `src/app/(seller)/seller/transportadoras/` (novo): página + actions.
- `src/lib/transportadoras/` (novo, convenção de módulo por domínio do `CLAUDE.md`): parser de planilha, loop de validação LangGraph (ver skill `langgraph-loop`), lógica de merge override×global.
- Depende de `docs/prd/fluxo-frete-completo.md` (motor % preservado) e não conflita com `uber-direct-checkout-milestone1` (fonte `uber_direct` é outro valor do mesmo enum).
