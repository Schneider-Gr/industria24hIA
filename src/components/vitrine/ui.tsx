import Link from "next/link";
import { CarrinhoBadge } from "@/components/carrinho/carrinho";
import { formatBRL } from "@/components/seller/format";

/**
 * Design system da vitrine (DESIGN.md): industrial/utilitário com dobra
 * editorial. Roxo = identidade, laranja = ação, amarelo = destaque.
 * Preço sempre em Geist tabular (`num`), tags retangulares radius 4px.
 */

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m14 14 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Logo real do industria24h.com.br (Bubble), fidelidade pedida pelo usuário.
export function LogoIndustria24h({ className = "h-8" }: { className?: string }) {
  return <img src="/logo-industria24h.png" alt="Indústria 24h" className={`w-auto ${className}`} />;
}

function CampoBusca({ className = "" }: { className?: string }) {
  return (
    <form action="/busca" className={`relative ${className}`} role="search">
      <input
        type="search"
        name="q"
        placeholder="Buscar produtos na indústria…"
        className="w-full rounded-sm border border-transparent bg-white px-4 py-2.5 pr-11 text-sm text-ink placeholder:text-muted outline-none focus:border-amarelo"
        aria-label="Buscar produtos"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-2 text-roxo-800 hover:bg-roxo-100 transition-colors"
      >
        <IconeBusca className="h-5 w-5" />
      </button>
    </form>
  );
}

export function VitrineHeader() {
  return (
    <header className="sticky top-0 z-40 bg-roxo-800 shadow-[0_1px_0_rgba(0,0,0,.15)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* Linha 1: logo + ações */}
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="shrink-0">
            <LogoIndustria24h className="h-7" />
          </Link>

          {/* Busca desktop */}
          <CampoBusca className="hidden md:block md:max-w-[520px] md:flex-1" />

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="rounded-sm px-3 py-1.5 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/seller"
              className="hidden sm:inline-flex rounded-sm bg-laranja px-4 py-1.5 text-sm font-semibold text-white hover:bg-laranja-escuro transition-colors"
            >
              Vender no 24h
            </Link>
            <CarrinhoBadge />
          </nav>
        </div>

        {/* Linha 2: busca mobile */}
        <div className="pb-3 md:hidden">
          <CampoBusca />
        </div>
      </div>
    </header>
  );
}

export function VitrineFooter() {
  return (
    <footer className="mt-auto bg-roxo-900 text-white/70">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <LogoIndustria24h className="h-6" />
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed">
            Marketplace B2B industrial da Amazônia. Compre direto de quem
            fabrica, sem atravessador.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">
            Para quem compra
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white">Lojas e produtos</Link></li>
            <li><Link href="/carrinho" className="hover:text-white">Meu carrinho</Link></li>
            <li><Link href="/login" className="hover:text-white">Meus pedidos</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">
            Para quem fabrica
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/seller" className="hover:text-white">Painel do vendedor</Link></li>
            <li><Link href="/login" className="hover:text-white">Abrir minha loja grátis</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1280px] px-4 py-4 text-xs text-white/50 sm:px-6">
          Indústria 24h · Manaus/AM
        </p>
      </div>
    </footer>
  );
}

/** Título de seção com kicker editorial (DESIGN.md). */
export function TituloSecao({
  kicker,
  children,
  acao,
}: {
  kicker?: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-laranja">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-[22px] font-bold text-ink sm:text-[28px]">
          {children}
        </h2>
      </div>
      {acao}
    </div>
  );
}

type Produto = {
  id: string;
  nome: string;
  valor: number;
  img?: string | null;
  imagem_url?: string | null;
  quantidade_minima?: number | null;
};

export function ProdutoCard({ produto }: { produto: Produto }) {
  const img = produto.img ?? produto.imagem_url ?? null;
  return (
    <Link
      href={`/produto/${produto.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-roxo-800 hover:shadow-[0_4px_16px_rgba(76,29,149,.10)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#F3F4F6]">
        {img ? (
          <img
            src={img}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-sm leading-snug text-ink group-hover:text-roxo-800">
          {produto.nome}
        </p>
        <p className="num mt-auto pt-1 text-lg font-bold text-ink">
          {formatBRL(produto.valor)}
        </p>
        {produto.quantidade_minima != null && produto.quantidade_minima > 1 && (
          <p className="text-[11px] text-muted">
            pedido mín. <span className="num">{produto.quantidade_minima}</span> un
          </p>
        )}
      </div>
    </Link>
  );
}

// Card da seção "Produtos com descontos progressivos" da home real: preço
// base riscado + menor preço da faixa como "Com desconto progressivo".
export function ProdutoDescontoCard({
  produto,
}: {
  produto: { id: string; nome: string; valor: number; menorPreco: number; img: string | null };
}) {
  return (
    <Link
      href={`/produto/${produto.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-roxo-800 hover:shadow-[0_4px_16px_rgba(76,29,149,.10)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#F3F4F6]">
        {produto.img ? (
          <img
            src={produto.img}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-sm leading-snug text-ink group-hover:text-roxo-800">
          {produto.nome}
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <p className="num text-lg font-bold text-ink">{formatBRL(produto.menorPreco)}</p>
          <p className="num text-xs text-muted line-through">{formatBRL(produto.valor)}</p>
        </div>
        <span className="mt-1 inline-flex w-fit items-center rounded-sm bg-amarelo/10 px-2 py-0.5 text-[11px] font-semibold text-ink">
          desconto progressivo
        </span>
      </div>
    </Link>
  );
}

type Loja = {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  logotipo_url?: string | null;
  permite_retirada_na_loja?: boolean | null;
  valor_pedido_minimo?: number | null;
};

export function LojaCard({ loja }: { loja: Loja }) {
  const localizacao = [loja.cidade, loja.estado].filter(Boolean).join("/");

  return (
    <Link
      href={`/loja/${loja.id}`}
      className="group flex flex-col gap-3 rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-roxo-800 hover:shadow-[0_4px_16px_rgba(76,29,149,.10)]"
    >
      <div className="flex items-center gap-3">
        {loja.logotipo_url ? (
          <img
            src={loja.logotipo_url}
            alt={loja.nome}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-roxo-800 font-display text-lg font-bold text-white">
            {loja.nome.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink group-hover:text-roxo-800">
            {loja.nome}
          </p>
          {localizacao && (
            <p className="truncate text-xs text-muted">{localizacao}</p>
          )}
        </div>
      </div>
      {(loja.permite_retirada_na_loja || (loja.valor_pedido_minimo ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {loja.permite_retirada_na_loja && <Tag>retirada na loja</Tag>}
          {(loja.valor_pedido_minimo ?? 0) > 0 && (
            <Tag>
              mín. <span className="num">{formatBRL(loja.valor_pedido_minimo!)}</span>
            </Tag>
          )}
        </div>
      )}
    </Link>
  );
}

/** Tag retangular radius 4px, fundo claro / texto escuro (regra anti-slop). */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-roxo-100 px-2 py-0.5 text-[11px] font-medium text-roxo-800">
      {children}
    </span>
  );
}
