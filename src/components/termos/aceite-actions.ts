"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Registra o aceite dos termos do usuário logado. A versão gravada é o
 * `atualizado_em` da página CMS no momento do aceite — o que importa depois é
 * QUAL texto a pessoa leu, não só a data.
 */
export async function aceitarTermos(slugs: string[], caminho: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const { data: paginas } = await supabase
    .from("paginas_cms")
    .select("slug, atualizado_em")
    .in("slug", slugs);

  const versaoPorSlug = new Map(
    (paginas ?? []).map((p) => [p.slug, p.atualizado_em ?? null]),
  );

  const { error } = await supabase.from("aceites_termos").upsert(
    slugs.map((slug) => ({
      user_id: user.id,
      slug,
      versao: versaoPorSlug.get(slug) ?? null,
    })),
    { onConflict: "user_id,slug", ignoreDuplicates: true },
  );

  if (error) return { erro: "Não foi possível registrar o aceite. Tente de novo." };

  revalidatePath(caminho);
  return { ok: true };
}
