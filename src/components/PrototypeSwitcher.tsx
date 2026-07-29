"use client";

// PROTÓTIPO — barra flutuante de troca de variante. Descartável, some em prod.
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; nome: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const i = Math.max(0, variants.findIndex((v) => v.key === current));

  function ir(delta: number) {
    const prox = variants[(i + delta + variants.length) % variants.length];
    const p = new URLSearchParams(params);
    p.set("variant", prox.key);
    router.replace(`${pathname}?${p}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") ir(-1);
      if (e.key === "ArrowRight") ir(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/90 px-2 py-1.5 text-white shadow-lg ring-1 ring-white/20">
      <button onClick={() => ir(-1)} className="rounded-full px-2.5 py-0.5 hover:bg-white/15">
        ←
      </button>
      <span className="px-2 text-xs font-medium tabular-nums">
        {variants[i].key} — {variants[i].nome}
      </span>
      <button onClick={() => ir(1)} className="rounded-full px-2.5 py-0.5 hover:bg-white/15">
        →
      </button>
    </div>
  );
}
