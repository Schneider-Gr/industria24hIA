// Kill switch TEMPORÁRIO do Cloudflare Turnstile — pedido do dono em 2026-08-31.
// `false` = o serviço fica inativo: verificarTurnstile() não chama a API de
// siteverify do Cloudflare e o TurnstileWidget não renderiza (o botão de submit
// libera direto). As env vars TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY
// continuam setadas na Vercel — só este flag desliga.
//
// REATIVAR: voltar para `true` + redeploy, e restaurar os testes de token
// válido/inválido/rede em src/lib/turnstile.test.ts do histórico do git.
//
// `: boolean` explícito (não deixar inferir o literal `false`) para o TS/ESLint
// não marcar o caminho ativo como código morto enquanto o flag está desligado.
export const TURNSTILE_ATIVO: boolean = false;
