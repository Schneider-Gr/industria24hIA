// Remonta a cada navegação (App Router): transição fade+slide-up sutil
// entre páginas (redesign vitrine — Navegação), respeitando prefers-reduced-motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition" style={{ animation: "fade-slide-up 180ms ease-out" }}>
      {children}
    </div>
  );
}
