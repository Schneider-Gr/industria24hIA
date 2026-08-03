import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Destino dos links de e-mail (convite, recuperação, confirmação).
// Verifica o token_hash e cria a sessão em cookie; depois manda para `next`.
// `code` também é aceito aqui (mesmo mecanismo de /auth/callback): com o
// projeto em flowType PKCE, se o template de e-mail no painel do Supabase
// ainda usa o link "hosted" padrão ({{ .ConfirmationURL }}) em vez do
// customizado com {{ .TokenHash }}, o GoTrue redireciona de volta com
// `code=` na query em vez de `token_hash`+`type` — sem esse fallback, todo
// link de e-mail (recuperação, convite, confirmação de cadastro) cai
// sempre em "link inválido", mesmo sendo válido e recém-emitido.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  // Só caminho relativo interno: evita open redirect (inclusive "/\host").
  const next = safeNext(searchParams.get("next"), "/definir-senha");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect("/login?erro=link_invalido");
}
