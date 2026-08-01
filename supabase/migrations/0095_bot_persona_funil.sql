-- Bot de atendimento multi-persona (PRD 007): identifica quem fala
-- (consumidor/seller/motorista/afiliado) e registra o estágio do funil no
-- lead, em vez de tratar toda conversa de forma genérica.

alter table public.bot_conversas
  add column if not exists persona text
    check (persona in ('consumidor', 'seller', 'motorista', 'afiliado'));

alter table public.leads
  add column if not exists persona text
    check (persona in ('consumidor', 'seller', 'motorista', 'afiliado')),
  add column if not exists etapa_funil text
    check (etapa_funil in (
      'persona_identificada', 'em_atendimento', 'resolvido_pelo_bot',
      'escalado_humano', 'convertido', 'descartado'
    ));

create index if not exists leads_persona_idx on public.leads (persona);
