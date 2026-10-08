import { buscarEndereco } from "@/lib/cep";
import { createServiceClient } from "@/lib/supabase/service";
import { IBGE_MANAUS, municipioDoCep } from "./area";
import { bairroOficial, normalizarBairro } from "./bairros-manaus";

type CorridaSemBairro = { id: string; destino_cep: string | null; destino_bairro: string | null };

const ESPERA_MS = 2500;

// ponytail: o bairro do destino é preenchido quando o parceiro abre a lista,
// no máximo 5 corridas por vez, pelo ViaCEP. Enquanto está nulo o filtro de
// área vale pela cidade. Se o volume crescer, preencher na criação da corrida.
export async function preencherBairroDestino(corridas: CorridaSemBairro[]): Promise<void> {
  const pendentes = corridas
    .filter((c) => !c.destino_bairro && c.destino_cep && municipioDoCep(c.destino_cep)?.ibge === IBGE_MANAUS)
    .slice(0, 5);
  if (pendentes.length === 0) return;

  const svc = createServiceClient();
  await Promise.all(
    pendentes.map(async (c) => {
      const endereco = await Promise.race([
        buscarEndereco(c.destino_cep!).catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), ESPERA_MS)),
      ]);
      const cru = endereco?.bairro ?? "";
      const bairro = normalizarBairro(bairroOficial(cru) ?? cru);
      if (!bairro) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- coluna da 0217 fora dos tipos gerados
      await (svc as any).from("corridas").update({ destino_bairro: bairro }).eq("id", c.id).is("destino_bairro", null);
      c.destino_bairro = bairro;
    }),
  );
}
