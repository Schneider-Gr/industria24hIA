import Link from "next/link";
import { formatBRL } from "@/components/seller/format";

export function VitrineHeader() {
  return (
    <header className="bg-roxo-800">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-xl font-800 text-white">
          Indústria<span className="text-amarelo">24h</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded border border-white px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Entrar
          </Link>
          <Link
            href="/seller"
            className="rounded bg-laranja px-4 py-1.5 text-sm font-semibold text-white hover:bg-laranja-escuro"
          >
            Painel do vendedor
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function VitrineFooter() {
  return (
    <footer className="bg-roxo-900">
      <div className="mx-auto max-w-[1280px] px-4 py-8 text-sm text-white/70 sm:px-6">
        <p className="font-semibold text-white">Indústria 24h</p>
        <p>Manaus/AM</p>
      </div>
    </footer>
  );
}

type Produto = {
  id: string;
  nome: string;
  valor: number;
  img?: string | null;
};

export function ProdutoCard({ produto }: { produto: Produto }) {
  return (
    <Link
      href={`/produto/${produto.id}`}
      className="group block rounded bg-white border border-borda overflow-hidden hover:border-roxo-800"
    >
      <div className="aspect-square w-full bg-gray-200">
        {produto.img ? (
          <img
            src={produto.img}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            sem imagem
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-sm text-ink group-hover:text-roxo-800">
          {produto.nome}
        </p>
        <p className="num mt-1 text-lg font-semibold text-ink">
          {formatBRL(produto.valor)}
        </p>
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
};

export function LojaCard({ loja }: { loja: Loja }) {
  const localizacao = [loja.cidade, loja.estado].filter(Boolean).join("/");

  return (
    <Link
      href={`/loja/${loja.id}`}
      className="flex items-center gap-3 rounded border border-borda bg-white p-3 hover:border-roxo-800"
    >
      {loja.logotipo_url ? (
        <img
          src={loja.logotipo_url}
          alt={loja.nome}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-roxo-800 text-lg font-semibold text-white">
          {loja.nome.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{loja.nome}</p>
        {localizacao && (
          <p className="truncate text-xs text-muted">{localizacao}</p>
        )}
      </div>
    </Link>
  );
}
