"use server";

// Tabela de travessias (0202, #804): balsas e portos que o simulador do avião
// soma quando a rota atravessa o rio. Escrita protegida pela RLS de admin; a
// action confere o papel de novo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { travessiaDoForm } from "@/lib/logistica-parceiro/travessias";

export type TravessiaState = { ok: boolean; erro?: string; msg?: string };

export async function salvarTravessia(_prev: TravessiaState, f: FormData): Promise<TravessiaState> {
  if (!(await isAdmin())) return { ok: false, erro: "Acesso restrito ao admin." };
  const { erros, dados } = travessiaDoForm(f);
  if (!dados) return { ok: false, erro: erros.join(" ") };
  const id = String(f.get("id") ?? "").trim();

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0202 fora dos tipos gerados
  const tabela = (supabase as any).from("travessias");
  const { error } = id
    ? await tabela.update({ ...dados, atualizado_em: new Date().toISOString() }).eq("id", id)
    : await tabela.insert(dados);
  if (error) return { ok: false, erro: error.message };

  revalidatePath("/admin/travessias");
  return { ok: true, msg: id ? "Travessia atualizada." : "Travessia criada." };
}
