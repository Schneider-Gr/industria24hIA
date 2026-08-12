"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ITENS = [
  { href: "/afiliado", label: "Minhas afiliações" },
  { href: "/afiliado/solicitar", label: "Solicitar afiliação" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-30 rounded-md bg-roxo-900 p-2 text-white md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[200px] shrink-0 flex-col bg-roxo-900 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-roxo-800 px-4 py-5">
          <p className="font-display text-lg font-bold leading-tight text-white">
            Indústria 24h
          </p>
          <p className="mt-1 text-xs text-roxo-100">Painel do afiliado</p>
        </div>
        <nav className="flex flex-col py-2">
          {ITENS.map((item) => {
            const ativo =
              item.href === "/afiliado"
                ? pathname === "/afiliado"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={ativo ? "page" : undefined}
                className={`px-4 py-2.5 text-sm transition-colors ${
                  ativo
                    ? "bg-roxo-800 font-semibold text-white"
                    : "text-roxo-100 hover:bg-roxo-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
