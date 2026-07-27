"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VenderPage() {
  const router = useRouter();

  useEffect(() => {
    async function verificarERotear() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/seller/cadastro");
        return;
      }

      const { data: loja } = await supabase
        .from("lojas")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (loja) {
        router.push("/seller");
      } else {
        router.push("/seller/minha-loja");
      }
    }

    void verificarERotear();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted">Carregando...</p>
    </div>
  );
}
