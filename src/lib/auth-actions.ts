"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarEmail, templateRecuperarSenha, templateConfirmarCadastro } from "@/lib/email";
import { checarLimite } from "@/lib/rate-limit";

// Login precisa passar pelo server pra ter uma chave de rate limit
// confiável (IP) antes de existir usuário autenticado — signInWithPassword
// direto no client (como era antes) não dava esse gancho. Trava por
// e-mail (impede força bruta numa conta específica) e por IP (impede
// varredura de e-mails a partir da mesma origem).
export async function entrarComSenha(
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string }> {
  const emailLimpo = email.trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";

  const limiteEmailOk = checarLimite(`login-email:${emailLimpo}`, 5, 60_000);
  const limiteIpOk = checarLimite(`login-ip:${ip}`, 20, 60_000);
  if (!limiteEmailOk || !limiteIpOk) {
    Sentry.captureMessage("Rate limit: login", {
      level: "warning",
      tags: { area: "login", signal: "rate_limit" },
    });
    return { ok: false, erro: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
  if (error) return { ok: false, erro: "E-mail ou senha incorretos." };
  return { ok: true };
}

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

// Cria a conta via Admin API (em vez de supabase.auth.signUp no client) e
// envia a confirmação pela Resend — mesmo motivo do reset de senha: e-mail
// padrão do Supabase sem marca e com rate limit baixo. admin.generateLink
// cria o usuário (não confirmado) e devolve o link sem disparar e-mail
// nenhum sozinho, diferente do signUp do client.
export async function criarConta(
  email: string,
  senha: string,
  next: string,
): Promise<{ ok: boolean; erro?: string }> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return { ok: false, erro: "E-mail inválido." };
  if (senha.length < 8) return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "signup",
    email: emailLimpo,
    password: senha,
    options: { redirectTo: `https://industria24.com.br/auth/confirm?next=${next}` },
  });
  if (error) {
    return {
      ok: false,
      erro: error.message.includes("already registered")
        ? "Já existe uma conta com esse e-mail. Faça login ou use \"Esqueci a senha\"."
        : "Não foi possível criar a conta. Tente de novo.",
    };
  }
  if (!data.properties?.action_link) {
    return { ok: false, erro: "Não foi possível criar a conta. Tente de novo." };
  }

  await enviarEmail({
    to: emailLimpo,
    subject: "Confirme seu e-mail — Indústria 24h",
    text: `Falta um passo para ativar sua conta na Indústria 24h. Acesse o link para confirmar: ${data.properties.action_link}`,
    html: templateConfirmarCadastro(data.properties.action_link),
  });
  return { ok: true };
}
