// Fonte única de verdade sobre se o Supabase está configurado.
// Nunca lança em import: a UI decide mostrar <ErrorState/> quando não configurado
// (regra 1 do projeto: falhar honesto > mockar).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
