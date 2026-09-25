## Context

Motivação em proposal.md. Estado do schema (verificado em `database.types.ts` e em produção `tiwdqgyeyvceaiqqwitc`, 24/09/2026):

- `transportadoras` (0099, 0139, 0145): `id, nome, fonte, prazo_dias, logo_url, loja_id` (null = global), `ativo`, `fake`. Produção: 2 linhas, ambas globais ("Uber Direct" e "Entrega Rápida I24", `fake`).
- `transportadora_faixas_frete` (0145, 0147): `transportadora_id, loja_id` (null = global, preenchido = override), `cep_destino_inicial/final integer, peso_min, peso_max, valor, ativo`. Produção: 0 linhas.
- `cotar_frete_tabela` (0146, 0148) prioriza a faixa com `loja_id` da loja sobre a global. Não é alterada aqui (M2).
- `centros_distribuicao.cep integer` já existe (0176, check 1000000..99999999; trigger exige CEP só para `tipo='industria'`). Produção: 22 centros `Ativo`, só 1 com CEP (o da Indústria).
- `produtos.taxonomia_no_id → taxonomia_nos(id, parent_id)` (PRD 041).
- RLS `transportadoras_read`: `ativo or is_admin() or dono` → qualquer usuário lê transportadora **própria** ativa de outra loja. Mesma forma em `transportadora_faixas_frete_read`.
- Pipeline de upload (change `transportadoras-tabela-frete-followup`, PR #457): `arquivo.ts` → `csv.ts` / `xlsx.ts` (sem dependência nova) → `parser-tabela-frete.ts` → actions `pravisualizar*` / `confirmar*`.

## Goals / Non-Goals

**Goals:** schema e telas do M1 do PRD 049, prontos para o M2 consumir sem nova mudança de modelo; isolamento por loja corrigido no banco.

**Non-Goals:** mudar `cotar_frete_tabela`, `checkout_criar_pedido` ou o checkout; desativar a "Entrega Rápida I24" (M2); prazo para postar e pós-venda (M3); cotação em tempo real por API.

## Decisions

**D1. Estender tabelas existentes em vez de criar um módulo novo.** `transportadoras` ganha `codigo_referencia, peso_min, peso_max, valor_min, valor_max, altura_max, largura_max, comprimento_max, fator_cubagem, url_rastreio, desativada_por_admin boolean default false, motivo_desativacao text, encerra_em date`. `transportadora_faixas_frete` ganha `cep_origem_inicial, cep_origem_final integer null, prazo_min, prazo_max integer null, ad_valorem, kg_adicional, icms, frete_minimo, taxa_fixa numeric default 0, cd_id uuid null, veiculo text null` (os dois últimos só na grade simples). Alternativa descartada: tabela nova `tabelas_frete` versionada; a decisão da dona é substituir a tabela inteira, sem histórico, e há 0 linhas para migrar.

**D2. Unicidade de nome por constraint.** `unique index on transportadoras (loja_id, lower(nome)) where loja_id is not null`. O banco garante mesmo com duas abas abertas.

**D3. Ativação de global em tabela própria.** `loja_transportadoras (loja_id, transportadora_id, codigo_cliente text not null, contrato_aceito_em timestamptz not null, ativo boolean, primary key (loja_id, transportadora_id))`, RLS por dono da loja e admin. Check por trigger: `transportadora_id` precisa ser global. Alternativa descartada: coluna array em `lojas`, porque o código de cliente e a data do aceite pertencem à relação.

**D4. Substituição atômica por RPC.** `substituir_faixas_transportadora(p_transportadora_id uuid, p_faixas jsonb, p_cd_id uuid default null)`, `security definer`, verifica que o chamador é dono da transportadora (ou admin para global) e que a transportadora não está `desativada_por_admin`, revalida sobreposição e faz `delete` + `insert` numa transação. Com `p_cd_id`, troca só as faixas da grade daquele CD. Motivo: `delete` + `insert` pelo client em duas chamadas deixa a transportadora sem tabela se a segunda falhar, e a spec exige "a tabela anterior continua valendo".

**D5. Sobreposição validada duas vezes.** No parser (preview, para apontar as linhas ao usuário) e na RPC (garantia). Chave: `(origem, destino, peso)` com intervalos; ordena por origem e destino e varre os pesos, O(n log n) para 15.000 linhas. Linhas da grade simples com `veiculo` diferente não conflitam entre si: são as alternativas de veículo, e o M2 escolhe a de menor `peso_max` que comporta o envio.

**D6. Remoção do override.** A coluna `loja_id` em `transportadora_faixas_frete` passa a significar só "faixa de transportadora própria" (igual ao `loja_id` da transportadora). Constraint: faixa de transportadora global tem `loja_id null`. A prioridade por `loja_id` da 0148 continua funcionando e fica sem efeito prático, porque não há mais faixa da loja para uma global. O M2 reescreve a RPC.

**D7. RLS de leitura corrigida.** `transportadoras_read`: `(loja_id is null and ativo) or is_admin() or dono`. `transportadora_faixas_frete_read`: faixa de global ativa é legível por autenticado (o seller precisa ver a tabela negociada antes de ativar); faixa própria só pelo dono e admin. `loja_transportadoras`, `transportadora_nos`, `transportadora_grade_simples` e `transportadora_veiculos` nascem com RLS negando por padrão, liberando dono e admin. O checkout continua lendo via RPC `security definer`, sem depender dessa policy.

**D8. Seller não reativa a desativada pelo admin.** Trigger `before update` em `transportadoras`: se `old.desativada_por_admin` e o usuário não é admin, recusa mudar `ativo` ou `desativada_por_admin`. Policy sozinha não expressa "esta coluna só o admin muda".

**D9. Categorias por tabela de ligação.** `transportadora_nos (transportadora_id, taxonomia_no_id, primary key (…))`. O contador de produtos usa CTE recursiva sobre `taxonomia_nos.parent_id` a partir dos nós marcados, contando `produtos` da loja. Nó removido: `on delete cascade` apaga a ligação, e um trigger em `taxonomia_nos` grava aviso para os donos das transportadoras afetadas. Sem nó restante, a transportadora volta a "leva tudo" (decisão 6 do PRD), e é por isso que o aviso é obrigatório.

**D10. Grade simples guardada e convertida.** `transportadora_veiculos (transportadora_id, veiculo in ('moto','carro','utilitario'), peso_max, altura_max, largura_max, comprimento_max)` e `transportadora_grade_simples (transportadora_id, cd_id, zona, veiculo, preco, prazo_min, prazo_max)` e parâmetros avançados por transportadora e CD. `zonas_cep (zona, cep_inicial, cep_final)` é semeada por migration a partir da planilha "Industria24 - Manaus por bairro" (690 faixas de 67 bairros, conferidas no ViaCEP 40/40) mais as faixas de CEP das cidades vizinhas. Salvar a grade chama `substituir_faixas_transportadora` com `p_cd_id`. A grade fica guardada para o seller editar de novo; as faixas são derivadas.

**D11. CEP do CD obrigatório na aplicação, não no banco.** A action de criar e editar centro exige CEP e endereço e valida com `buscarEndereco` de `src/lib/cep.ts`. Sem CHECK nem trigger novo, porque 21 centros de seller existentes não têm CEP e qualquer update neles quebraria (mesmo motivo registrado na 0176). Colunas novas: `endereco text, aceita_retirada boolean default false, horario_retirada text`.

**D12. Aviso de tabela global atualizada e encerramento.** Reaproveitar a tabela de notificações do painel do seller já usada pelos avisos de estoque (PRD 047), confirmando o nome no apply. O encerramento roda num cron diário (padrão dos jobs existentes) que avisa em `encerra_em - 7` e desativa em `encerra_em`.

## Risks / Trade-offs

- [21 CDs sem CEP deixam lojas sem origem de frete] → pendência no painel (spec cadastro-transportadora) e contato com os sellers antes do M2.
- [Formato zona × veículo não validado com transportadoras de Manaus] → grade e veículos guardados em tabela: mudar colunas ou zonas depois não exige migrar faixa, só gerar de novo.
- [Remover o override quebra quem já sobrescreveu] → 0 faixas em produção em 24/09/2026; conferir de novo com `db query` antes de aplicar.
- [Trocar a RLS de leitura esconde dado que alguma tela lia direto] → grep por `from("transportadoras")` e `from("transportadora_faixas_frete")` em client e server antes do apply; o checkout lê pela RPC.
- [Seed de `zonas_cep` desatualizado] → faixas de 69000-000 a 69099-999 sem buraco; CEP fora das zonas simplesmente não é atendido.

## Migration Plan

1. Número pelo `scripts/proximo-migration.sh`, conferido de novo com `--checar` antes do push.
2. Testar cada migration em `begin; … select <verificação>; rollback;` via `supabase db query --linked` (regra do projeto).
3. Ordem: colunas e constraints → tabelas novas com RLS → policies de leitura → RPC `substituir_faixas_transportadora` → triggers → seed `zonas_cep`.
4. Rollback: as colunas e tabelas são aditivas. Reverter a RLS é restaurar as policies da 0099 e da 0145; a RPC antiga de upload continua existindo até o deploy da UI nova.

## Open Questions

- Nome exato da tabela de avisos do painel do seller reaproveitada em D12: confirmar no apply, sem mudar spec ou tarefas.
- Faixas de CEP das 5 cidades vizinhas para o seed de `zonas_cep`: levantar no ViaCEP no apply.
