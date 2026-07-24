-- Registra a 0016 (venda_futura_desconto_progressivo, aplicada via SQL Editor
-- em 09/07) no histórico de migrations, para o db push do PR #10 não falhar.
insert into supabase_migrations.schema_migrations (version, name, statements)
select '0016', 'venda_futura_desconto_progressivo', null
where not exists (select 1 from supabase_migrations.schema_migrations where version = '0016');
select version, name from supabase_migrations.schema_migrations where version in ('0015','0016','0017') order by version;
