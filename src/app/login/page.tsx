"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

// ponytail: mapa de QA temporário, some sozinho em build de produção (ver uso abaixo).
const linksTeste = [
  {
    grupo: "Seller",
    links: [{ label: "Painel", href: "https://industria24.com.br/seller" }],
  },
  {
    grupo: "Afiliado",
    links: [
      { label: "Painel", href: "https://industria24.com.br/afiliado" },
      { label: "Logística", href: "https://industria24.com.br/afiliado/logistica" },
    ],
  },
  {
    grupo: "Parceiro logístico",
    links: [
      { label: "Painel", href: "https://industria24.com.br/parceiro" },
      { label: "Cadastro", href: "https://industria24.com.br/parceiro/cadastro" },
    ],
  },
  {
    grupo: "Corridas",
    links: [
      { label: "Painel", href: "https://industria24.com.br/corridas" },
      { label: "Nova corrida", href: "https://industria24.com.br/corridas/nova" },
    ],
  },
  {
    grupo: "Leilão reverso",
    links: [{ label: "Painel", href: "https://industria24.com.br/leilao" }],
  },
  {
    grupo: "Admin",
    links: [{ label: "Painel", href: "https://industria24.com.br/admin" }],
  },
];

const inputCls =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-roxo-800 focus:ring-2 focus:ring-roxo-800/15 dark:border-line dark:bg-surface";

// Login por e-mail/senha. "Esqueci a senha" dispara o e-mail de recuperação
// que aterrissa em /auth/confirm → /definir-senha.
export default function LoginPage() {
  // useSearchParams exige Suspense no prerender.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState<string | null>(
    params.get("erro") === "link_invalido"
      ? "Link inválido ou expirado. Entre com a senha ou peça um novo link."
      : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Falhas consecutivas nesta aba. Sinal de observabilidade (não é rate-limit:
  // o Supabase Auth já limita tentativas no servidor). Serve para o alerta
  // "possível força bruta" no Sentry enxergar picos de erro repetido.
  const falhasConsecutivas = useRef(0);

  async function entrar(formData: FormData) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const supabase = createClient();
    const { error, data } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("senha")),
    });
    setEnviando(false);
    if (error) {
      falhasConsecutivas.current += 1;
      if (falhasConsecutivas.current >= 3) {
        Sentry.captureMessage("login: tentativas consecutivas de falha", {
          level: "warning",
          tags: { area: "auth", signal: "repeated_login_failure" },
          extra: { falhasConsecutivas: falhasConsecutivas.current },
        });
      }
      setErro("E-mail ou senha incorretos.");
      return;
    }
    falhasConsecutivas.current = 0;

    const redirect = params.get("next");
    if (redirect) {
      router.push(redirect);
    } else {
      const { data: loja } = await supabase
        .from("lojas")
        .select("id")
        .eq("owner_id", data.user?.id)
        .maybeSingle();
      router.push(loja ? "/seller" : "/");
    }
    router.refresh();
  }

  async function esqueciSenha(email: string) {
    if (!email) {
      setErro("Preencha o e-mail para receber o link de recuperação.");
      return;
    }
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/definir-senha`,
    });
    if (error) {
      setErro("Não foi possível enviar o e-mail de recuperação. Tente de novo.");
      return;
    }
    setAviso("E-mail de recuperação enviado. Confira a caixa de entrada.");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Painel de marca — só na dobra larga, editorial como a home. */}
      <div className="relative hidden overflow-hidden bg-roxo-900 lg:block">
        <Image
          src="/banners/banner-principal.png"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-roxo-900 via-roxo-900/70 to-roxo-900/20" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="font-display text-xl font-800 text-white">
            Indústria<span className="text-amarelo">24h</span>
          </Link>
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-teal">
              Marketplace B2B da Amazônia
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white xl:text-[34px]">
              Direto da indústria para o seu negócio.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Compre e venda sem atravessadores. Loja grátis, plataforma retém
              5% por item.
            </p>
            <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[.1em] text-white/50">
              <span>Loja grátis</span>
              <span aria-hidden className="text-white/25">·</span>
              <span>Entrega em Manaus</span>
              <span aria-hidden className="text-white/25">·</span>
              <span>Direto do produtor</span>
            </p>

            <div className="mt-6 max-h-[260px] overflow-y-auto rounded border border-white/15 bg-black/30 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-amarelo">
                MVP — links de teste
              </p>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                  {linksTeste.map((secao) => (
                    <div key={secao.grupo}>
                      <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-white/50">
                        {secao.grupo}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {secao.links.map((l) => (
                          <li key={l.href}>
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-white/80 underline-offset-2 hover:text-white hover:underline"
                            >
                              {l.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Painel do formulário */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="font-display text-xl font-800 text-roxo-800 dark:text-roxo-200">
              Indústria<span className="text-laranja">24h</span>
            </span>
          </Link>

          <h1 className="font-display text-2xl font-bold text-ink">Entrar</h1>
          <p className="mt-1 text-sm text-muted">
            Acesse sua conta para comprar no marketplace.
          </p>

          <form action={entrar} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-ink-2">E-mail *</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Senha *</span>
              <input
                name="senha"
                type="password"
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </label>

            {erro && (
              <p
                role="alert"
                className="rounded border border-erro bg-erro/10 p-3 text-sm text-erro"
              >
                {erro}
              </p>
            )}
            {aviso && (
              <p
                role="status"
                className="rounded border border-ok bg-ok/10 p-3 text-sm text-ok"
              >
                {aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded bg-laranja px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-laranja-escuro disabled:opacity-50"
            >
              {enviando ? "Entrando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.form;
                void esqueciSenha(String(new FormData(form ?? undefined).get("email") ?? ""));
              }}
              className="w-full text-center text-sm text-roxo-800 underline-offset-2 hover:underline dark:text-roxo-200"
            >
              Esqueci a senha
            </button>

            <div className="border-t border-line pt-4 text-center text-sm text-muted">
              Ainda não tem conta?{" "}
              <Link
                href="/cadastro"
                className="font-semibold text-roxo-800 underline-offset-2 hover:underline dark:text-roxo-200"
              >
                Crie sua loja grátis
              </Link>
            </div>
          </form>

          {/* ponytail: contas de demo do MVP — visível em produção enquanto for MVP em teste */}
          <div className="mt-6 rounded border border-dashed border-amarelo/60 bg-amarelo/10 p-4 text-xs text-ink-2">
              <p className="font-semibold uppercase tracking-[.08em] text-ink">
                Ambiente de testes — contas de demonstração (MVP)
              </p>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Admin:</dt>
                  <dd className="break-all">admin-teste-i24@example.com</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Seller (loja construção):</dt>
                  <dd className="break-all">seller-teste-i24@example.com</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Comprador:</dt>
                  <dd className="break-all">comprador-teste-i24@example.com</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Afiliado (vendas):</dt>
                  <dd className="break-all">afiliado-teste-i24@example.com</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Parceiro logístico 1:</dt>
                  <dd className="break-all">parceiro1-teste-i24@example.com</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0 font-medium">Parceiro logístico 2:</dt>
                  <dd className="break-all">parceiro2-teste-i24@example.com</dd>
                </div>
              </dl>
              <p className="mt-2 font-medium">Senha (todas): Teste-i24h-2026!</p>
            </div>
        </div>
      </div>
    </main>
  );
}
