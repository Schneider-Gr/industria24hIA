"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { limparCep, CEP_COOKIE, type EnderecoCep } from "@/lib/cep";

export async function definirCepComprador(endereco: EnderecoCep) {
  const limpo = limparCep(endereco.cep);
  if (limpo.length !== 8) return;

  const cookieStore = await cookies();
  cookieStore.set(CEP_COOKIE, JSON.stringify({ ...endereco, cep: limpo }), {
    maxAge: 60 * 60 * 24 * 180, // 180 dias, mesmo horizonte do endereço salvo
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function limparCepComprador() {
  const cookieStore = await cookies();
  cookieStore.delete(CEP_COOKIE);
  revalidatePath("/", "layout");
}
