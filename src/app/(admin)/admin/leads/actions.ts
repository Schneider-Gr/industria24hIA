"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;
type Status = (typeof STATUS)[number];

// Tipos manuais: `leads` (migration 0088) ainda fora de database.types.ts,
// mesmo motivo documentado em src/lib/ai/botDb.ts.
interface ClientComLeads {
  from(table: "leads"): {
    update(values: { status: Status }): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
  };
}

export async function setStatusLead(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUS.includes(status as Status)) throw new Error("Parâmetros inválidos.");

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { error } = await supabase.from("leads").update({ status: status as Status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}
