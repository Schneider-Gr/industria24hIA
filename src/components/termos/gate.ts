import { createClient } from "@/lib/supabase/server";
import type { DocumentoTermos } from "@/components/termos/PortaoTermos";

/** Documentos que cada painel exige na primeira entrada. */
export const TERMOS_SELLER: DocumentoTermos[] = [
  { slug: "termos-mercado-futuro", titulo: "Termos do Mercado Futuro (venda futura)" },
];

export const TERMOS_AFILIADO: DocumentoTermos[] = [
  { slug: "termos-afiliado-logistica", titulo: "Termos do Afiliado de Logística" },
  { slug: "termos-afiliado-vendas", titulo: "Termos do Afiliado de Vendas" },
];

/** Slugs que o usuário ainda não aceitou (vazio = liberado). */
export async function termosPendentes(
  documentos: DocumentoTermos[],
): Promise<DocumentoTermos[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sem sessão o próprio painel já mostra o estado de "precisa login".
  if (!user) return [];

  const { data: aceites } = await supabase
    .from("aceites_termos")
    .select("slug")
    .eq("user_id", user.id);

  const aceitos = new Set((aceites ?? []).map((a) => a.slug));
  return documentos.filter((d) => !aceitos.has(d.slug));
}
