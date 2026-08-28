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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Espelha o pathname num header — Server Components não recebem a URL, e os
  // gates de papel usam isso pra liberar as páginas de onboarding.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && exigeSessao(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${pathname}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
