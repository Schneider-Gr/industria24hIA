# web — Fundação Industria24h

App Next.js (App Router, TS strict, Tailwind) + Supabase. Reconstrução do portal
Bubble industria24h.com.br. Docs de engenharia reversa na raiz do repo (`../docs`).
Leia `../CLAUDE.md` antes de codar: **proibido mockar, proibido inventar schema**.

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com URL + anon key do Supabase
npm run dev
```

Sem `.env.local`, a rota `/acessos` mostra um `ErrorState` honesto (por design).

## Estado atual (fundação)

- `supabase/migrations/0001_acessos.sql` — tabela `acessos` (único Data Type com
  campos confirmados), RLS ativado e **deny-by-default** (sem policy até a Privacy
  Rule real ser capturada).
- `src/lib/supabase/{client,server,env}.ts` — clients padrão `@supabase/ssr`.
- `src/app/acessos/page.tsx` — fatia vertical: leitura real de `acessos`, com
  loading/error/empty tratados. Zero mock.

## Próximo (bloqueado até schema real)

O marketplace (Produto_ecommerce, Loja_ecommerce, LinhaItem, pedidos…) só entra
quando os campos reais forem extraídos — via Data API do app ou editor Bubble.
Ver `../docs/migration.md`, Prioridade 4.
