"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarEmail, templateRecuperarSenha } from "@/lib/email";

// Encerra a sessão e volta pro login. Usado pelo botão "Sair" do header
// dos painéis (seller/admin) — não existia nenhum ponto de logout antes.
export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// "Esqueci a senha" via Resend em vez do e-mail padrão do Supabase
// (mail.app.supabase.io — sem marca e com rate limit baixo pra tráfego
// real de MVP). Gera o link com o Admin API (service role) e envia com o
// mesmo template de identidade visual do carrinho abandonado.
// Sempre retorna sucesso pro chamador: erro de "usuário não existe" do
// Admin API não pode vazar pro client (enumeração de e-mail).
export async function solicitarRecuperacaoSenha(email: string): Promise<void> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return;

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: emailLimpo,
    options: { redirectTo: "https://industria24.com.br/auth/confirm?next=/definir-senha" },
  });
  if (error || !data.properties?.action_link) return;

  await enviarEmail({
    to: emailLimpo,
    subject: "Redefinir sua senha — Indústria 24h",
    text: `Recebemos um pedido para redefinir a senha da sua conta na Indústria 24h. Acesse o link para continuar: ${data.properties.action_link}`,
    html: templateRecuperarSenha(data.properties.action_link),
  });
}
