// Selo "24h ABERTO" sobreposto ao hero (mockup industria24h-redesign.html) —
// ponteiros decorativos via CSS, sem dado nenhum: reforça a identidade "24h".
export function HeroDialBadge() {
  return (
    <div
      className="absolute right-4 top-4 z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm"
      aria-hidden
    >
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-lm-amarelo/50">
        <span
          className="absolute left-1/2 top-1/2 h-[1.6px] w-[9px] origin-left rounded-sm bg-lm-amarelo"
          style={{ animation: "girar-ponteiro 9s linear infinite" }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-[1.2px] w-[13px] origin-left rounded-sm bg-lm-amarelo opacity-70"
          style={{ animation: "girar-ponteiro 3s linear infinite" }}
        />
        <span className="text-center font-display text-[10px] font-black leading-tight text-white">
          24h
          <span className="block font-sans text-[6px] font-bold tracking-[0.08em] text-lm-amarelo">
            ABERTO
          </span>
        </span>
      </div>
    </div>
  );
}
