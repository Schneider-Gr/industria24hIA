import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MapaPais } from "./pendencias";

// Mapa filho → pai só dos nós que interessam (os dos produtos da loja e os
// marcados nas transportadoras) e dos ancestrais deles. A árvore inteira tem
// ~18 mil nós; subir nível a nível lê só o caminho até a raiz (profundidade
// ~6, uma consulta por nível).
export async function carregarPais(supabase: SupabaseClient<Database>, nos: Iterable<string>): Promise<MapaPais> {
  const pais: MapaPais = new Map();
  let pendentes = [...new Set(nos)];
  for (let nivel = 0; nivel < 12 && pendentes.length > 0; nivel++) {
    const { data } = await supabase.from("taxonomia_nos").select("id, parent_id").in("id", pendentes);
    const proximos: string[] = [];
    for (const n of data ?? []) {
      pais.set(n.id, n.parent_id);
      if (n.parent_id && !pais.has(n.parent_id)) proximos.push(n.parent_id);
    }
    pendentes = [...new Set(proximos)];
  }
  return pais;
}
