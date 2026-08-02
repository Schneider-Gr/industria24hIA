// Selo "24h ABERTO" sobreposto ao hero (mockup industria24h-redesign.html) —
// ponteiros decorativos via CSS, sem dado nenhum: reforça a identidade "24h".
// 3x o tamanho original em telas ≥sm (pedido do dono, 01/08). No mobile o
// banner é mais baixo (aspect-[2/1], ~195px em 390px de largura) — medido
// ao vivo antes deste ajuste: 110px cabe com folga (pedido de aumentar de
// novo, 02/08), diferente da 1ª tentativa 3x que estourava.
export function HeroDialBadge() {
  return (
    <div
      className="absolute right-3 top-3 z-10 flex h-[110px] w-[110px] items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm sm:right-4 sm:top-4 sm:h-[192px] sm:w-[192px]"
      aria-hidden
    >
      <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border border-dashed border-lm-amarelo/50 sm:h-[132px] sm:w-[132px]">
        <span
          className="absolute left-1/2 top-1/2 h-[2.7px] w-[15px] origin-left rounded-sm bg-lm-amarelo sm:h-[4.8px] sm:w-[27px]"
          style={{ animation: "girar-ponteiro 9s linear infinite" }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-[2.1px] w-[23px] origin-left rounded-sm bg-lm-amarelo opacity-70 sm:h-[3.6px] sm:w-[39px]"
          style={{ animation: "girar-ponteiro 3s linear infinite" }}
        />
        <span className="text-center font-display text-[17px] font-black leading-tight text-white sm:text-[30px]">
          24h
          <span className="block font-sans text-[10px] font-bold tracking-[0.08em] text-lm-amarelo sm:text-[18px]">
            ABERTO
          </span>
        </span>
      </div>
    </div>
  );
}
