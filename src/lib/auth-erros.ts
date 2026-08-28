// Detecta o "e-mail já cadastrado" do GoTrue em `admin.generateLink`. O texto
// e a estrutura variam por versão do Supabase Auth: mensagem "already been
// registered" ou "already exists", ou `code: "email_exists"`. A checagem de
// substring exata `includes("already registered")` sozinha deixava esse caso
// cair na mensagem genérica ("Não foi possível criar a conta") — o usuário que
// já tinha conta ficava sem a dica de fazer login.
export function ehEmailJaCadastrado(erro: { code?: string | null; message?: string | null }): boolean {
  return (
    erro.code === "email_exists" ||
    erro.code === "user_already_exists" ||
    /already\s(?:been\s)?registered|already\sexists/i.test(erro.message ?? "")
  );
}

// GoTrue limita `admin.generateLink` (signup/recovery) pelo rate limit de
// e-mail — 2/h com o serviço embutido do Supabase, sem SMTP custom. A 3ª
// tentativa na mesma hora volta 429 e caía no genérico "Não foi possível
// criar a conta". Causa confirmada do print de QA em 28/08 (nenhum
// auth.users novo desde 25/08). Fix real: configurar SMTP custom (Resend)
// em Auth → Emails no dashboard.
export function ehRateLimitEmail(erro: { code?: string | null; message?: string | null; status?: number | null }): boolean {
  return (
    erro.code === "over_email_send_rate_limit" ||
    erro.status === 429 ||
    /rate limit|too many requests/i.test(erro.message ?? "")
  );
}
