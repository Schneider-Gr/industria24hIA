"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { limparCep, CEP_COOKIE, type EnderecoCep } from "@/lib/cep";
import { enderecoDaCoordenada } from "@/lib/geo";

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

/** "Utilizar localização automática": o navegador dá lat/lng, o reverse
 *  geocoding devolve o CEP correspondente. Recebe a coordenada em vez do CEP
 *  porque o browser não conhece CEP — e assim a coordenada exata do comprador
 *  já entra no cookie, sem gastar uma segunda chamada para geocodificar de volta. */
export async function definirLocalizacaoAutomatica(
  lat: number,
  lon: number,
): Promise<{ ok: true; cidade: string; uf: string } | { ok: false; erro: string }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, erro: "Coordenada inválida." };
  }

  const r = await enderecoDaCoordenada({ lat, lon });
  if (!r.ok) {
    return {
      ok: false,
      erro:
        r.erro === "sem_resultado"
          ? "Não identificamos um CEP na sua localização. Digite o CEP abaixo."
          : "Não conseguimos usar sua localização agora. Digite o CEP abaixo.",
    };
  }

  await definirCepComprador({
    cep: r.valor.cep,
    rua: "",
    bairro: "",
    cidade: r.valor.cidade,
    uf: r.valor.uf,
    lat,
    lon,
  });
  return { ok: true, cidade: r.valor.cidade, uf: r.valor.uf };
}
