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
