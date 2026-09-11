"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sair } from "@/lib/auth-actions";
import { useSessaoUsuario } from "@/lib/useSessaoUsuario";
import { abrirAtendimento } from "@/components/bot/abrirAtendimento";
import {
  IconeAjuda,
  IconeColetivas,
  IconeComissao,
  IconeConta,
  IconeCupom,
  IconeDoc,
  IconeEntrega,
  IconeIntegrar,
  IconeLoja,
  IconeMensagens,
  IconeOfertas,
  IconePedidos,
  IconeVendaFutura,
} from "@/components/vitrine/icones-menu";

type Props = { aberto: boolean; aoFechar: () => void };

// Bottom sheet da aba "Mais" da tab bar mobile (5ª aba, padrão Mercado
// Livre). Espelha TUDO que o desktop oferece fora da tab bar: chips do
// header (Ofertas / Venda Futura / Compras coletivas), CTA "Vender no 24h",
// menu de conta e as quatro colunas do rodapé. "Meu Perfil" do comprador
// ainda não existe no rebuild Next.js (só no Bubble legado) — não inventar
// rota.
type Icone = (p: { className?: string }) => React.ReactElement;
type Item = { href: string; label: string; externo?: boolean; icone: Icone };
type Grupo = { titulo: string; icone: Icone; itens: readonly Item[] };
/** `grupos` presente = seção colapsada (drill). Ausente = itens no primeiro
 *  grau. Pedido de 11/09: o comprador navega sem abrir nada; quem vende ou
 *  entrega abre o grupo dele. */
type Secao = { titulo: string; itens?: readonly Item[]; grupos?: readonly Grupo[] };

const SECOES: readonly Secao[] = [
  {
    // Primeiro grau, sempre aberto: é a navegação do consumidor.
    // Favoritos, Avisos e Cupons do comprador ficaram de fora porque não há
    // página para eles no Next.js — não inventar rota.
    titulo: "Minha conta",
    itens: [
      { href: "/meus-pedidos", label: "Meus Pedidos e histórico", icone: IconePedidos },
      { href: "/mensagens", label: "Mensagens", icone: IconeMensagens },
    ],
  },
  {
    titulo: "Comprar",
    itens: [
      { href: "/#ofertas", label: "Ofertas", icone: IconeOfertas },
      { href: "/#mercado-futuro", label: "Venda Futura", icone: IconeVendaFutura },
      { href: "/coletivas", label: "Compras coletivas", icone: IconeColetivas },
      { href: "/compra-coletiva", label: "Como funciona a Compra Coletiva", icone: IconeColetivas },
    ],
  },
  {
    // Tudo que é do lado vendedor do marketplace, colapsado em submenus.
    titulo: "Vender no marketplace",
    grupos: [
      {
        titulo: "Painel do vendedor",
        icone: IconeLoja,
        itens: [
          { href: "/seller", label: "Minhas vendas", icone: IconeLoja },
          { href: "/seller/cupons", label: "Meus cupons", icone: IconeCupom },
          { href: "/venda-no-industria", label: "Vender no Indústria 24h", icone: IconeLoja },
        ],
      },
      {
        titulo: "Painel do afiliado",
        icone: IconeComissao,
        itens: [
          { href: "/afiliado", label: "Minhas comissões", icone: IconeComissao },
          { href: "/vender-como-afiliado", label: "Venda como Afiliado", icone: IconeComissao },
        ],
      },
      {
        titulo: "Logística e entregas",
        icone: IconeEntrega,
        itens: [
          { href: "/seja-parceiro", label: "Seja parceiro", icone: IconeEntrega },
          { href: "/afiliado/solicitar", label: "Afiliado logístico", icone: IconeEntrega },
          { href: "/parceiro/cadastro", label: "Motorista / transportadora", icone: IconeEntrega },
        ],
      },
      {
        titulo: "Integrar",
        icone: IconeIntegrar,
        itens: [
          { href: "/integracoes", label: "Integração via MCP", icone: IconeIntegrar },
          { href: "/desenvolvedores", label: "Desenvolvedores", icone: IconeIntegrar },
        ],
      },
    ],
  },
  {
    titulo: "Ajuda",
    itens: [
      { href: "https://tutorial.industria24.com.br", label: "Central de Tutoriais", externo: true, icone: IconeAjuda },
      { href: "/atalhos", label: "Atalhos", icone: IconeAjuda },
      { href: "/termos/termos-de-uso", label: "Termos de Uso", icone: IconeDoc },
      { href: "/termos/politica-de-privacidade", label: "Política de Privacidade", icone: IconeDoc },
    ],
  },
] as const;

const CLASSE_ITEM =
  "flex w-full items-center gap-3 px-3 py-3 text-left text-[14px] font-medium text-ink-2 active:bg-lm-azul/5";

function ItemMenu({ item, aoFechar }: { item: Item; aoFechar: () => void }) {
  return item.externo ? (
    <a href={item.href} onClick={aoFechar} className={CLASSE_ITEM}>
      <item.icone className="h-[18px] w-[18px] shrink-0 text-muted" />
      {item.label}
    </a>
  ) : (
    <Link href={item.href} onClick={aoFechar} className={CLASSE_ITEM}>
      <item.icone className="h-[18px] w-[18px] shrink-0 text-muted" />
      {item.label}
    </Link>
  );
}

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
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
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
              className="flex items-center justify-center gap-2 rounded-sm bg-lm-azul px-4 py-2.5 text-center text-[14px] font-semibold text-white"
            >
              <IconeConta className="h-[18px] w-[18px]" />
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
              {secao.itens && (
                <ul>
                  {secao.itens.map((item) => (
                    <li key={item.href}>
                      <ItemMenu item={item} aoFechar={aoFechar} />
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
                        <IconeAjuda className="h-[18px] w-[18px] shrink-0 text-muted" />
                        Falar com o atendimento
                      </button>
                    </li>
                  )}
                </ul>
              )}

              {/* ponytail: <details>/<summary> nativo — acordeão acessível e
                  com teclado de graça, sem estado nem biblioteca. */}
              {secao.grupos?.map((grupo) => (
                <details key={grupo.titulo} className="group border-t border-line/70 first:border-t-0">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 text-[14px] font-semibold text-ink marker:content-none">
                    <grupo.icone className="h-[18px] w-[18px] shrink-0 text-lm-azul" />
                    <span className="flex-1">{grupo.titulo}</span>
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" fill="none" aria-hidden>
                      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <ul className="pb-1 pl-3">
                    {grupo.itens.map((item) => (
                      <li key={item.href}>
                        <ItemMenu item={item} aoFechar={aoFechar} />
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
