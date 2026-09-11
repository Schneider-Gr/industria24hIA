"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sair } from "@/lib/auth-actions";
import { useSessaoUsuario } from "@/lib/useSessaoUsuario";
import { abrirAtendimento } from "@/components/bot/abrirAtendimento";

type Props = { aberto: boolean; aoFechar: () => void };

// Bottom sheet da aba "Mais" da tab bar mobile (5ª aba, padrão Mercado
// Livre). Espelha TUDO que o desktop oferece fora da tab bar: chips do
// header (Ofertas / Venda Futura / Compras coletivas), CTA "Vender no 24h",
// menu de conta e as quatro colunas do rodapé. "Meu Perfil" do comprador
// ainda não existe no rebuild Next.js (só no Bubble legado) — não inventar
// rota.
type Item = { href: string; label: string; externo?: boolean };
type Secao = { titulo: string; itens: readonly Item[] };

const SECOES: readonly Secao[] = [
  {
    // Pedido no vídeo do Jam (11/09): o hambúrguer tem de levar aos painéis
    // que já existem. Favoritos, Avisos e Cupons do comprador ficaram de
    // fora porque não há página para eles no Next.js — não inventar rota.
    titulo: "Minha conta",
    itens: [
      { href: "/meus-pedidos", label: "Meus Pedidos e histórico" },
      { href: "/mensagens", label: "Mensagens" },
      { href: "/seller", label: "Painel do vendedor" },
      { href: "/afiliado", label: "Painel do afiliado" },
      { href: "/seller/cupons", label: "Meus cupons" },
    ],
  },
  {
    titulo: "Comprar",
    itens: [
      { href: "/#ofertas", label: "Ofertas" },
      { href: "/#mercado-futuro", label: "Venda Futura" },
      { href: "/coletivas", label: "Compras coletivas" },
      { href: "/compra-coletiva", label: "Como funciona a Compra Coletiva" },
    ],
  },
  {
    titulo: "Vender",
    itens: [
      { href: "/seja-fornecedor", label: "Vender no Indústria 24h" },
      { href: "/vender-como-afiliado", label: "Venda como Afiliado" },
    ],
  },
  {
    titulo: "Entregar",
    itens: [
      { href: "/seja-parceiro", label: "Seja parceiro" },
      { href: "/afiliado/solicitar", label: "Afiliado logístico" },
      { href: "/parceiro/cadastro", label: "Motorista / transportadora" },
    ],
  },
  {
    titulo: "Integrar",
    itens: [
      { href: "/integracoes", label: "Integração via MCP" },
      { href: "/desenvolvedores", label: "Desenvolvedores" },
    ],
  },
  {
    titulo: "Ajuda",
    itens: [
      { href: "https://tutorial.industria24.com.br", label: "Central de Tutoriais", externo: true },
      { href: "/atalhos", label: "Atalhos" },
      { href: "/termos/termos-de-uso", label: "Termos de Uso" },
      { href: "/termos/politica-de-privacidade", label: "Política de Privacidade" },
    ],
  },
] as const;

const CLASSE_ITEM =
  "block w-full px-3 py-3 text-left text-[14px] font-medium text-ink-2 active:bg-lm-azul/5";

export function MenuMais({ aberto, aoFechar }: Props) {
  const email = useSessaoUsuario();
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl anim-entra">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />

        {/* Conta primeiro: é o que muda conforme a sessão. */}
        <div className="shrink-0 border-b border-line px-3 py-3">
          {email ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{email}</p>
                <Link
                  href="/mensagens"
                  onClick={aoFechar}
                  className="text-[12.5px] font-medium text-lm-azul"
                >
                  Mensagens
                </Link>
              </div>
              <form action={sair}>
                <button type="submit" className="shrink-0 rounded-sm border border-line px-3 py-1.5 text-[13px] font-semibold text-ink-2">
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={aoFechar}
              className="block rounded-sm bg-lm-azul px-4 py-2.5 text-center text-[14px] font-semibold text-white"
            >
              Entrar ou criar conta
            </Link>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {SECOES.map((secao) => (
            <div key={secao.titulo} className="border-b border-line last:border-b-0">
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.12em] text-muted">
                {secao.titulo}
              </p>
              <ul>
                {secao.itens.map((item) => (
                  <li key={item.href}>
                    {item.externo ? (
                      <a href={item.href} onClick={aoFechar} className={CLASSE_ITEM}>
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} onClick={aoFechar} className={CLASSE_ITEM}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
                {secao.titulo === "Ajuda" && (
                  <li>
                    <button
                      type="button"
                      className={CLASSE_ITEM}
                      onClick={() => {
                        aoFechar();
                        abrirAtendimento();
                      }}
                    >
                      Falar com o atendimento
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
