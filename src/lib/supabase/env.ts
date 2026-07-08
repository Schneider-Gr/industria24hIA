// Fonte única de verdade sobre se o Supabase está configurado.
// Nunca lança em import: a UI decide mostrar <ErrorState/> quando não configurado
// (regra 1 do projeto: falhar honesto > mockar).

// Sanitiza BOM (U+FEFF) e espaços: env var salva via PowerShell/Windows chega
// com BOM no início e quebra a montagem dos headers HTTP do Supabase com
// "TypeError: Cannot convert argument to a ByteString ... value of 65279"
// (bug real em produção na Vercel, 07/07/2026).
const clean = (v: string | undefined) =>
  (v ?? "").replace(/^[﻿​]+/, "").trim();

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
