import type { Delta } from "@/lib/admin/dashboard-kpis";

// Selo de variação vs. período anterior. `delta` null (sem base de comparação)
// ou período "tudo" → não renderiza nada.
export function DeltaBadge({ delta }: { delta: Delta | null }) {
  if (!delta) return null;

  const seta = delta.direcao === "up" ? "▲" : delta.direcao === "down" ? "▼" : "→";
  const cor =
    delta.direcao === "up"
      ? "text-ok"
      : delta.direcao === "down"
        ? "text-erro"
        : "text-muted";
  const abs = Math.abs(delta.pct);
  const texto = `${abs < 0.5 ? "0" : abs.toFixed(abs < 10 ? 1 : 0)}%`;
  const rotulo =
    delta.direcao === "up"
      ? `subiu ${texto} vs. período anterior`
      : delta.direcao === "down"
        ? `caiu ${texto} vs. período anterior`
        : "estável vs. período anterior";

  return (
    <span
      className={`num text-xs font-semibold ${cor}`}
      aria-label={rotulo}
      title={rotulo}
    >
      {seta} {texto}
    </span>
  );
}
