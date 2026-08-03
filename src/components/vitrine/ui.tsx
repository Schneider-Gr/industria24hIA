import Link from "next/link";
import { CarrinhoBadge } from "@/components/carrinho/carrinho";
import { BotaoAddRapido } from "@/components/carrinho/BotaoAddRapido";
import { BotaoComprarRapido } from "@/components/carrinho/BotaoComprarRapido";
import { CepBar } from "@/components/vitrine/CepBar";
import { MegaMenuCategorias } from "@/components/vitrine/MegaMenuCategorias";
import { LoginModal } from "@/components/vitrine/LoginModal";
import { formatBRL } from "@/components/seller/format";

/**
 * Design system da vitrine (DESIGN.md, "Leroy Merlin" 2026-07-29): header/footer
 * em lm-marinho, ação/CTA em lm-azul (a LM usa verde aqui — trocado por decisão
 * do dono). Preço em `num` tabular, tags radius 4px.
 * Nota: cards de produto/loja abaixo (ProdutoCard/LojaCard/Tag/Entrega24hBadge)
 * ainda usam os tokens aco, sinal e verde-24h da identidade anterior — migração
 * fica para quando esses componentes forem tocados (ver DESIGN.md).
 */

// Links secundários do header, além de Categorias — ≥lg na linha 1, e como
// chips de rolagem horizontal abaixo disso (ver VitrineHeader).
const LINKS_SECUNDARIOS = [
  { href: "/#ofertas", label: "Ofertas" },
  { href: "/#mercado-futuro", label: "Venda Futura" },
  { href: "/coletivas", label: "Compras coletivas" },
] as const;

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
        placeholder="Buscar produtos, marcas e categorias…"
        className="w-full rounded-full border border-transparent bg-white px-4 py-2.5 pr-12 text-[14.5px] text-ink placeholder:text-muted outline-none focus:border-lm-azul sm:px-5 sm:py-3"
        aria-label="Buscar produtos"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-lm-azul text-white transition-colors hover:bg-lm-azul-escuro"
      >
        <IconeBusca className="h-4 w-4" />
      </button>
    </form>
  );
}

export function VitrineHeader() {
  return (
    <header className="sticky top-0 z-40 bg-lm-marinho shadow-[0_1px_0_rgba(0,0,0,.15)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* Linha 1: logo + ações */}
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="shrink-0">
            <LogoIndustria24h className="h-7" />
          </Link>

          {/* Só cabe confortavelmente ao lado da busca + CEP + login + 2
              botões + carrinho a partir de telas largas (lg). Entre md e lg
              (tablet) esses links colapsam na tira de chips abaixo, junto
              com o mobile — em vez de simplesmente desaparecer sem
              alternativa (era o caso antes, só existiam ≥768px). */}
          <div className="hidden items-center gap-4 lg:flex">
            <MegaMenuCategorias />
            {LINKS_SECUNDARIOS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13.5px] font-semibold text-white/80 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Busca desktop — mais larga (pedido explícito, referência
              barra-superior.jpg), campo é o elemento dominante do header. */}
          <CampoBusca className="hidden md:block md:max-w-[720px] md:flex-1" />

          <nav className="flex shrink-0 items-center gap-2">
            <CepBar />
            <LoginModal />
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              <Link
                href="/seja-fornecedor"
                className="rounded-sm bg-lm-azul px-4 py-1.5 text-[13px] font-semibold tracking-[0.04em] text-white hover:bg-lm-azul-escuro transition-colors"
              >
                Vender no 24h
              </Link>
              <Link
                href="/vender-como-afiliado"
                className="rounded-sm border border-white/40 bg-transparent px-4 py-1.5 text-[13px] font-semibold tracking-[0.04em] text-white/80 hover:bg-white/10 transition-colors"
              >
                Venda como Afiliado
              </Link>
            </div>
            <CarrinhoBadge />
          </nav>
        </div>

        {/* Linha 2: busca (mobile only — desktop já tem no header) */}
        <div className="flex items-center gap-2 pb-3 md:hidden">
          <CampoBusca className="flex-1" />
        </div>

        {/* Linha extra: Categorias + Ofertas/Venda Futura/Compras coletivas,
            sempre que a linha 1 não tem espaço pra eles (< lg). Categorias
            vinha só na linha 2 (md:hidden) — sumia inteira entre md e lg,
            faixa tablet onde a linha 1 também já esconde o menu (só aparece
            em lg:flex). Agora fica aqui, cobrindo mobile + tablet numa vez só. */}
        <div className="scroll-chips flex items-center gap-2 overflow-x-auto pb-3 lg:hidden">
          <MegaMenuCategorias />
          {LINKS_SECUNDARIOS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function VitrineFooter() {
  return (
    <footer className="mt-auto bg-lm-marinho text-white/70">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
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
            <li><Link href="/compra-coletiva" className="hover:text-white">Compra Coletiva</Link></li>
            <li><Link href="/vender-como-afiliado" className="hover:text-white">Venda como Afiliado</Link></li>
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">
            Para quem entrega
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/seja-parceiro" className="hover:text-white">Seja parceiro</Link></li>
            <li><Link href="/afiliado/solicitar" className="hover:text-white">Afiliado logístico</Link></li>
            <li><Link href="/parceiro/cadastro" className="hover:text-white">Motorista / transportadora</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">
            Para quem integra
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/integracoes" className="hover:text-white">Integração via MCP</Link></li>
            <li><Link href="/desenvolvedores" className="hover:text-white">Desenvolvedores</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-white/50 sm:px-6">
          <p>Indústria 24h · Manaus/AM</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/termos/termos-de-uso" className="hover:text-white">Termos de Uso</Link>
            <Link href="/termos/politica-de-privacidade" className="hover:text-white">Política de Privacidade</Link>
          </div>
        </div>
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
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-lm-azul">
            {kicker}
          </p>
        )}
        {/* Ritmo Renner: hierarquia vem do tracking e do espaço, não do corpo
            grande — caixa alta 14-16px peso 600 tracking-[0.08em]. */}
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-ink sm:text-base">
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
  loja_id?: string;
};

/**
 * Botões rápidos para as duas seções de PDP que têm âncora própria
 * (id="venda-futura"/"compra-coletiva" em src/app/produto/[id]/page.tsx).
 * Leva direto pra lá em vez de só empilhar mais um clique na listagem —
 * o card não replica o formulário de compra/adesão, isso continua no PDP.
 */
function BotoesRapidosCard({
  produtoId,
  temVendaFutura,
  temCompraColetiva,
}: {
  produtoId: string;
  temVendaFutura?: boolean;
  temCompraColetiva?: boolean;
}) {
  if (!temVendaFutura && !temCompraColetiva) return null;
  return (
    <div className="relative z-10 mt-1.5 flex flex-wrap gap-1.5">
      {temVendaFutura && (
        <Link
          href={`/produto/${produtoId}#venda-futura`}
          className="inline-flex items-center rounded-sm bg-lm-azul/10 px-2 py-0.5 text-[11px] font-semibold text-lm-azul hover:bg-lm-azul/20"
        >
          Venda futura
        </Link>
      )}
      {temCompraColetiva && (
        <Link
          href={`/produto/${produtoId}#compra-coletiva`}
          className="inline-flex items-center rounded-sm bg-lm-vermelho/10 px-2 py-0.5 text-[11px] font-semibold text-lm-vermelho hover:bg-lm-vermelho/20"
        >
          Compra coletiva
        </Link>
      )}
    </div>
  );
}

export function ProdutoCard({
  produto,
  lojaCidade,
  lojaEstado,
  lojaNome,
  temVendaFutura,
  temCompraColetiva,
}: {
  produto: Produto;
  lojaCidade?: string | null;
  lojaEstado?: string | null;
  lojaNome?: string | null;
  temVendaFutura?: boolean;
  temCompraColetiva?: boolean;
}) {
  const img = produto.img ?? produto.imagem_url ?? null;
  // Estrutura em "stretched link": o <Link> principal cobre o card inteiro
  // via absolute inset-0, e os botões rápidos (também <Link>/<button>) ficam
  // por cima (z-10) — evita âncora aninhada dentro de âncora (HTML inválido)
  // mantendo o card inteiro clicável para o PDP.
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-lm-azul hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]">
      <Link href={`/produto/${produto.id}`} className="absolute inset-0 z-0" aria-label={produto.nome} />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6]">
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
        {produto.loja_id && (
          <>
            <BotaoAddRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: lojaNome ?? "",
                img,
              }}
            />
            <BotaoComprarRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: lojaNome ?? "",
                img,
              }}
            />
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="pointer-events-none line-clamp-2 min-h-[2.5em] text-[13px] leading-snug text-ink group-hover:text-lm-azul sm:text-sm">
          {produto.nome}
        </p>
        <p className="pointer-events-none num mt-auto pt-1 text-base font-bold text-ink sm:text-lg">
          {formatBRL(produto.valor)}
        </p>
        {produto.quantidade_minima != null && produto.quantidade_minima > 1 && (
          <p className="pointer-events-none text-[11px] text-muted">
            pedido mín. <span className="num">{produto.quantidade_minima}</span> un
          </p>
        )}
        <Entrega24hBadge cidade={lojaCidade} estado={lojaEstado} />
        <BotoesRapidosCard
          produtoId={produto.id}
          temVendaFutura={temVendaFutura}
          temCompraColetiva={temCompraColetiva}
        />
      </div>
    </div>
  );
}

// Card da seção "Produtos com descontos progressivos" da home real: preço
// base riscado + menor preço da faixa como "Com desconto progressivo".
export function ProdutoDescontoCard({
  produto,
  lojaCidade,
  lojaEstado,
  lojaNome,
}: {
  produto: {
    id: string;
    nome: string;
    valor: number;
    menorPreco: number;
    img: string | null;
    loja_id?: string;
    loja_nome?: string;
    quantidade_minima?: number | null;
  };
  lojaCidade?: string | null;
  lojaEstado?: string | null;
  lojaNome?: string;
}) {
  const percentualOff = Math.round((1 - produto.menorPreco / produto.valor) * 100);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-lm-azul hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]">
      <Link href={`/produto/${produto.id}`} className="absolute inset-0 z-0" aria-label={produto.nome} />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6]">
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
        {produto.loja_id && (
          <>
            <BotaoAddRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: produto.loja_nome ?? lojaNome ?? "",
                img: produto.img,
              }}
            />
            <BotaoComprarRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: produto.loja_nome ?? lojaNome ?? "",
                img: produto.img,
              }}
            />
          </>
        )}
      </div>
      <div className="pointer-events-none flex flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-snug text-ink group-hover:text-lm-azul sm:text-sm">
          {produto.nome}
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <p className="num text-base font-bold text-ink sm:text-lg">{formatBRL(produto.menorPreco)}</p>
          <p className="num text-xs text-muted line-through">{formatBRL(produto.valor)}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex w-fit items-center rounded-sm bg-lm-azul/10 px-2 py-0.5 text-[11px] font-semibold text-lm-azul-escuro">
            desconto progressivo
          </span>
          {percentualOff > 0 && (
            <span className="num inline-flex w-fit items-center rounded-sm bg-lm-azul/10 px-2 py-0.5 text-[11px] font-semibold text-lm-azul-escuro">
              -{percentualOff}% OFF
            </span>
          )}
        </div>
        <Entrega24hBadge cidade={lojaCidade} estado={lojaEstado} />
      </div>
    </div>
  );
}

// Card do Supermercado/Hortifruti (mockup 29/07): thumb branco (distinto do
// cinza do ProdutoCard genérico), mesmo padrão de tag de desconto progressivo
// já usado em ProdutoDescontoCard — sem inventar campo de "marca" (schema não
// tem; as fotos já trazem o logo da marca embutido, como visto em produção).
export function GroceryCard({
  produto,
}: {
  produto: {
    id: string;
    nome: string;
    valor: number;
    img: string | null;
    temDescontoProgressivo: boolean;
    loja_id?: string;
    loja_nome?: string;
    quantidade_minima?: number | null;
  };
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-lm-azul hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]">
      <Link href={`/produto/${produto.id}`} className="absolute inset-0 z-0" aria-label={produto.nome} />
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-white">
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
        {produto.loja_id && (
          <>
            <BotaoAddRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: produto.loja_nome ?? "",
                img: produto.img,
              }}
            />
            <BotaoComprarRapido
              produto={{
                produto_id: produto.id,
                nome: produto.nome,
                valor: produto.valor,
                quantidade_minima: produto.quantidade_minima ?? null,
                loja_id: produto.loja_id,
                loja_nome: produto.loja_nome ?? "",
                img: produto.img,
              }}
            />
          </>
        )}
      </div>
      <div className="pointer-events-none flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-snug text-ink group-hover:text-lm-azul sm:text-sm">
          {produto.nome}
        </p>
        <p className="num text-base font-bold text-ink sm:text-lg">{formatBRL(produto.valor)}</p>
        {produto.temDescontoProgressivo && (
          <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-lm-azul/10 px-2 py-0.5 text-[10.5px] font-semibold text-lm-azul-escuro">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 20h4v-4H4zM10 20h4v-8h-4zM16 20h4V8h-4z" />
            </svg>
            desconto progressivo
          </span>
        )}
      </div>
    </div>
  );
}

export type Loja = {
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
      className="group flex flex-col gap-3 rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-lm-azul hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]"
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lm-azul font-display text-lg font-bold text-white">
            {loja.nome.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink group-hover:text-lm-azul">
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
    <span className="inline-flex items-center rounded-sm bg-lm-cinza px-2 py-0.5 text-[11px] font-medium text-lm-azul">
      {children}
    </span>
  );
}

/** Selo de entrega rápida — só quando a loja tem cidade real (anti-mock). */
export function Entrega24hBadge({ cidade, estado }: { cidade?: string | null; estado?: string | null }) {
  const local = [cidade, estado].filter(Boolean).join("/");
  if (!local) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-ok/10 px-2 py-0.5 text-[11px] font-semibold text-ok">
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
        <path d="M6 1v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      Envio de {local}
    </span>
  );
}

/** Barra de confiança da vitrine (home) — texto + ícone inline, sem bolinhas. */
export function TrustBar() {
  const itens: { icone: React.ReactNode; texto: string }[] = [
    {
      icone: (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M8 2v6l4 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
      texto: "Aberto 24 horas por dia",
    },
    {
      icone: (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M2 12V6l6-3.5L14 6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 12h12M6 12V9h4v3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ),
      texto: "Direto de quem fabrica, sem atravessador",
    },
    {
      icone: (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M8 1.5 13.5 4v4c0 3.2-2.3 5.6-5.5 6.5C4.8 13.6 2.5 11.2 2.5 8V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="m5.8 8 1.6 1.6 3-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      texto: "Lojas locais aprovadas pela curadoria",
    },
  ];
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-3 text-xs font-normal tracking-[0.04em] text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        {itens.map((item) => (
          <span key={item.texto} className="inline-flex items-center gap-2">
            <span className="text-lm-azul">{item.icone}</span>
            {item.texto}
          </span>
        ))}
      </div>
    </div>
  );
}
