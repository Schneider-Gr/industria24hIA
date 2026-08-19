"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Tipo manual: `incidentes_atendimento` (migration 0131) ainda fora de
// database.types.ts, mesmo motivo documentado em src/lib/ai/botDb.ts.
interface ClientComIncidentes {
  from(table: "incidentes_atendimento"): {
    update(values: { status: "resolvido"; resolvido_em: string }): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
  };
}

export async function marcarIncidenteResolvido(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Incidente inválido.");

  const supabase = (await createClient()) as unknown as ClientComIncidentes;
  const { error } = await supabase
    .from("incidentes_atendimento")
    .update({ status: "resolvido", resolvido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/incidentes");
}
