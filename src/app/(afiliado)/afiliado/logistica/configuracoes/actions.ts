"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarConfigAfiliado } from "@/lib/logistica-parceiro/config-afiliado";

// valores: o React 19 limpa o form depois da action; devolvê-los evita perder o que foi digitado.
export type ConfigAfiliadoState = { ok: boolean; erro?: string; valores?: Record<string, string> };

export async function salvarConfigAfiliado(_prev: ConfigAfiliadoState, fd: FormData): Promise<ConfigAfiliadoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Faça login para salvar." };

  const s = (k: string) => String(fd.get(k) ?? "");
  const valores = Object.fromEntries(
    ["nome", "cep", "cidade", "bairro", "numero", "telefone", "veiculo", "peso", "minimo"].map((k) => [k, s(k)]),
  );
  const v = validarConfigAfiliado({
    nome: s("nome"), cep: s("cep"), cidade: s("cidade"), bairro: s("bairro"), numero: s("numero"),
    telefone: s("telefone"), veiculo: s("veiculo"), peso: s("peso"), minimo: s("minimo"),
  });
  if (!v.ok) return { ok: false, erro: v.erro, valores };

  const { data: atual } = await supabase.from("parceiros_logisticos").select("id").eq("user_id", user.id).maybeSingle();
  // Afiliado sem cadastro de parceiro ainda: nasce motorista, Pendente (default da 0039).
  const { error } = atual
    ? await supabase.from("parceiros_logisticos").update(v.campos).eq("id", atual.id)
    : await supabase.from("parceiros_logisticos").insert({ ...v.campos, user_id: user.id, tipo: "motorista" });
  if (error) return { ok: false, erro: error.message, valores };

  revalidatePath("/afiliado/logistica/configuracoes");
  return { ok: true, valores };
}
