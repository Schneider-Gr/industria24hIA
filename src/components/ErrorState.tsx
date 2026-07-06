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
      className="mx-auto max-w-xl rounded-lg border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {detail && <p className="mt-2 text-sm opacity-90">{detail}</p>}
    </div>
  );
}
