"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Captura erros de render não tratados no client — sem isto, erro boundary
// interno do Next engole a exceção e nada chega ao Sentry.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <h1>Algo deu errado</h1>
        <p>Tente novamente ou volte para a página inicial.</p>
      </body>
    </html>
  );
}
