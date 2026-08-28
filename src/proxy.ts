import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { exigeSessao } from "@/lib/gate-rotas";

// Proxy (ex-middleware — renomeado no Next 16, roda no runtime Node). Faz duas
// coisas e nada mais:
//  1. renova o cookie de sessão Supabase a cada request (padrão @supabase/ssr);
//  2. barra na borda request SEM sessão para os painéis, evitando o flash do
//     shell antes do gate do layout rodar.
// A checagem FINA de papel (admin/seller/afiliado/parceiro) continua no
// layout.tsx de cada route group + RLS — o proxy nunca consulta banco de papel.

// Rebuild dos headers a partir do request ATUAL (pega mutações de cookie do
// setAll) + espelha o pathname pro layout.tsx, que não recebe a URL e usa isso
// pra liberar as rotas de onboarding.
function respostaComPathname(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = respostaComPathname(request);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = respostaComPathname(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Auth do Supabase fora do ar: não derruba a navegação. O gate real é o
    // layout.tsx (que tem o próprio getUser com try/catch) + RLS.
    return response;
  }

  if (!user && exigeSessao(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
