import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import type { Database } from "./database.types";

// Client Supabase para Server Components / Route Handlers.
// Usa a anon key + cookies do usuário: RLS vale. Nunca usar service_role aqui.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // ponytail: chamado de um Server Component sem resposta mutável.
          // O proxy (src/proxy.ts) renova o cookie de sessão; aqui pode ignorar.
        }
      },
    },
  });
}
