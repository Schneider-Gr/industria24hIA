// Estado de erro honesto. Regra 1 do projeto: um <ErrorState/> visível é
// sempre melhor que dados falsos que escondem que a integração não existe.

export function ErrorState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-xl rounded border border-erro bg-erro/10 p-6 text-erro"
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {detail && <p className="mt-2 text-sm opacity-90">{detail}</p>}
    </div>
  );
}
