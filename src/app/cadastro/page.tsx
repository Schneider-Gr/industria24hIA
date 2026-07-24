"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Rota antiga de cadastro. Redirecionada para /seller/cadastro.
export default function CadastroPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seller/cadastro");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted">Redirecionando...</p>
    </div>
  );
}
