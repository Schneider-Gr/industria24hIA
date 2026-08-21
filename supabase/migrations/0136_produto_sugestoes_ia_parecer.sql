-- Estende produto_sugestoes_ia para aceitar pareceres de curadoria gerados
-- por IA (tipo 'parecer'), com uma decisão sugerida além do texto livre.
-- O admin sempre confirma manualmente em /admin/produtos/[id] — o agente
-- nunca grava direto em produto_curadoria nem muda status_produto.

alter table public.produto_sugestoes_ia
  drop constraint produto_sugestoes_ia_tipo_check,
  add constraint produto_sugestoes_ia_tipo_check
    check (tipo in ('descricao', 'imagem', 'dados_loja', 'parecer'));

alter table public.produto_sugestoes_ia
  add column decisao_sugerida text
    check (decisao_sugerida in ('aprovado', 'reprovado', 'sugestao'));
