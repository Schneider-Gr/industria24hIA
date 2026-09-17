"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarEmail, templateRecuperarSenha, templateConfirmarCadastro } from "@/lib/email";
import { checarLimite } from "@/lib/rate-limit";
import { verificarTurnstile } from "@/lib/turnstile";
import { ehEmailJaCadastrado, ehEmailNaoConfirmado, ehRateLimitEmail } from "@/lib/auth-erros";
import { resolverDestinoPorPapel } from "@/lib/auth";

// Login precisa passar pelo server pra ter uma chave de rate limit
// confiável (IP) antes de existir usuário autenticado — signInWithPassword
// direto no client (como era antes) não dava esse gancho. Trava por
// e-mail (impede força bruta numa conta específica) e por IP (impede
// varredura de e-mails a partir da mesma origem).
export async function entrarComSenha(
  email: string,
  senha: string,
  turnstileToken: string | null,
): Promise<{ ok: boolean; erro?: string; naoConfirmado?: boolean }> {
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

  if (!(await verificarTurnstile(turnstileToken, ip))) {
    return { ok: false, erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
  if (error) {
    // `naoConfirmado` em vez de deixar o client comparar o texto da mensagem:
    // a tela usa isso pra oferecer o botão de reenviar a confirmação (#659).
    if (ehEmailNaoConfirmado(error)) {
      return {
        ok: false,
        naoConfirmado: true,
        erro: "Falta confirmar seu e-mail. Abra o link que enviamos na caixa de entrada (confira o spam).",
      };
    }
    return { ok: false, erro: "E-mail ou senha incorretos." };
  }
  return { ok: true };
}

// Reenvia a confirmação de cadastro de uma conta que existe mas nunca
// confirmou o e-mail (link perdido, expirado ou no spam) — sem isso a conta
// ficava inacessível, porque "Esqueci a senha" não resolve falta de
// confirmação (Issue #659).
//
// Usa `auth.resend`, o método oficial para reenviar confirmação de signup.
// Diferente do cadastro e da recuperação, este e-mail sai pelo remetente do
// GoTrue (sem a identidade visual da Resend) e tem rate limit próprio: a
// doc do Admin API não garante o comportamento de `generateLink` para
// usuário já existente, e não vale trocar garantia por marca aqui.
//
// Sempre responde igual, exista a conta ou não, e confirmada ou não —
// senão o botão vira um detector de e-mails cadastrados.
export async function reenviarConfirmacao(email: string): Promise<void> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (!checarLimite(`reenvio-confirmacao:${emailLimpo}`, 3, 3_600_000) || !checarLimite(`reenvio-ip:${ip}`, 10, 3_600_000)) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: emailLimpo,
    options: { emailRedirectTo: "https://industria24.com.br/auth/confirm?next=/seller/minha-loja" },
  });
  if (error) {
    Sentry.captureMessage("Falha ao reenviar confirmação de cadastro", {
      level: ehRateLimitEmail(error) ? "warning" : "error",
      tags: { area: "auth", step: "resend-signup" },
      extra: { code: error.code, status: error.status },
    });
  }
}

// Destino do painel pós-login quando o formulário não tem `next`. Wrapper de
// server action pra `resolverDestinoPorPapel` (que é server-only) ser chamável
// do FormularioLogin (client).
export async function destinoPosLogin(): Promise<string> {
  return resolverDestinoPorPapel();
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
//
// Usa hashed_token pra montar o link direto pro NOSSO /auth/confirm em vez
// de mandar o action_link do Admin API (que aponta pro GoTrue hospedado,
// *.supabase.co/auth/v1/verify). Esse endpoint hospedado verifica o token
// e redireciona de volta com a sessão no FRAGMENTO da URL (#access_token=…)
// — fragmento nunca chega ao servidor, então /auth/confirm sempre caía em
// "link inválido". Existia um hack client-side (useRecuperacaoPorFragmento
// em /login) contando com o navegador preservar o fragmento antigo através
// do redirect de erro — funciona só quando o browser de fato preserva
// fragmento num 307 do Next.js, não é garantido. hashed_token evita esse
// hop pelo GoTrue por completo: o link já chega em /auth/confirm com
// token_hash+type na query, que a rota já sabe verificar direto.
export async function solicitarRecuperacaoSenha(email: string): Promise<void> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return;

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: emailLimpo,
    options: { redirectTo: "https://industria24.com.br/auth/confirm?next=/definir-senha" },
  });
  if (error || !data.properties?.hashed_token) {
    if (error) {
      Sentry.captureException(error, { tags: { area: "auth", step: "generateLink-recovery" } });
    }
    return;
  }

  const link = `https://industria24.com.br/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${encodeURIComponent("/definir-senha")}`;

  const { enviado, erro } = await enviarEmail({
    to: emailLimpo,
    subject: "Redefinir sua senha — Indústria 24h",
    text: `Recebemos um pedido para redefinir a senha da sua conta na Indústria 24h. Acesse o link para continuar: ${link}`,
    html: templateRecuperarSenha(link),
  });
  if (!enviado) {
    Sentry.captureMessage("Falha ao enviar e-mail de recuperação de senha", {
      level: "error",
      tags: { area: "auth", step: "enviarEmail-recovery" },
      extra: { erro },
    });
  }
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
  turnstileToken: string | null,
): Promise<{ ok: boolean; erro?: string; emailExistente?: boolean }> {
  const emailLimpo = email.trim().toLowerCase();
  if (!emailLimpo) return { ok: false, erro: "E-mail inválido." };
  if (senha.length < 8) return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (!(await verificarTurnstile(turnstileToken, ip))) {
    return { ok: false, erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "signup",
    email: emailLimpo,
    password: senha,
    options: { redirectTo: `https://industria24.com.br/auth/confirm?next=${next}` },
  });
  if (error) {
    // E-mail já cadastrado é resultado esperado, não falha da aplicação: não
    // vai pro Sentry (gerava alerta de erro a cada tentativa, issue
    // 2513cb15 de 15/09) e a tela oferece o link de recuperação na hora.
    if (ehEmailJaCadastrado(error)) {
      return {
        ok: false,
        emailExistente: true,
        erro: "Já existe uma conta com esse e-mail. Entre com sua senha ou receba um link para criar uma nova.",
      };
    }
    // Antes o erro do GoTrue era engolido — sem isto não dá pra saber se é
    // rate limit ou service key inválida em produção.
    Sentry.captureException(error, {
      tags: { area: "auth", step: "generateLink-signup" },
      extra: { code: error.code, status: error.status },
    });
    return {
      ok: false,
      erro: error.code === "weak_password"
        ? "Senha recusada: é fraca ou apareceu em vazamentos conhecidos. Escolha outra."
        : ehRateLimitEmail(error)
        ? "Muitas tentativas de cadastro agora. Aguarde alguns minutos e tente de novo."
        : "Não foi possível criar a conta. Tente de novo.",
    };
  }
  if (!data.properties?.hashed_token) {
    Sentry.captureMessage("criarConta: generateLink sem hashed_token", {
      level: "error",
      tags: { area: "auth", step: "generateLink-signup" },
    });
    return { ok: false, erro: "Não foi possível criar a conta. Tente de novo." };
  }

  // Mesmo motivo do reset de senha (#446): o action_link passa pelo GoTrue
  // hospedado, que confirma o e-mail mas devolve a sessão no fragmento —
  // o seller terminava em /login?erro=link_invalido logo após confirmar
  // (reproduzido em prod, Issue #642). Link direto pro nosso /auth/confirm.
  const link = `https://industria24.com.br/auth/confirm?token_hash=${data.properties.hashed_token}&type=signup&next=${encodeURIComponent(next)}`;

  await enviarEmail({
    to: emailLimpo,
    subject: "Confirme seu e-mail — Indústria 24h",
    text: `Falta um passo para ativar sua conta na Indústria 24h. Acesse o link para confirmar: ${link}`,
    html: templateConfirmarCadastro(link),
  });
  return { ok: true };
}
