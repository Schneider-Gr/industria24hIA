"use client";

import { useEffect, useRef, useState } from "react";

// Parte do topo mobile que recolhe ao rolar (benchmark Zé Delivery + regras
// do PRD 033 US01, change mobile-vitrine-densa-benchmark): busca e chips saem
// ao rolar para baixo; a linha de logo/CEP/conta fica. Qualquer rolagem para
// cima traz de volta. Não recolhe com foco dentro (usuário digitando) nem com
// modal aberto; ignora tremor de dedo abaixo de 10px.
//
// Recolher encolhe o header sticky, e o Chrome compensa com scroll anchoring
// — o que dispara outro evento de scroll no sentido oposto e faria o topo
// piscar sem parar. Por isso cada troca trava a leitura por 300ms.
//
// ponytail: anima grid-template-rows (layout) em vez de só transform/opacity
// como pede o DESIGN.md; translateY deixaria o espaço vazio no header. Sem
// animação sob prefers-reduced-motion.
export function TopoRecolhivel({ children }: { children: React.ReactNode }) {
  const [recolhido, setRecolhido] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const estado = useRef(false);

  useEffect(() => {
    let ultimoY = window.scrollY;
    let travadoAte = 0;
    let agendado = false;

    const trocar = (valor: boolean) => {
      if (estado.current === valor) return;
      estado.current = valor;
      setRecolhido(valor);
      travadoAte = performance.now() + 300;
    };

    const avaliar = () => {
      agendado = false;
      const y = window.scrollY;
      if (performance.now() < travadoAte) {
        ultimoY = y;
        return;
      }
      const delta = y - ultimoY;
      if (Math.abs(delta) < 10) return;
      ultimoY = y;

      if (y < 64 || delta < 0) return trocar(false);
      const focoDentro = ref.current?.contains(document.activeElement) ?? false;
      const modalAberto = document.querySelector('[aria-modal="true"]') !== null;
      if (!focoDentro && !modalAberto) trocar(true);
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(avaliar);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <div
      ref={ref}
      inert={recolhido}
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none md:hidden ${
        recolhido ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
