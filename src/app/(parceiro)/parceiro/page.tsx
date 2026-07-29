import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PageTitle, VazioBox } from "@/components/seller/states";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import {
  VariantA,
  VariantB,
  nomeA,
  nomeB,
  distanciaCep,
  type Corrida,
  type Rota,
} from "./prototype-variants";

// PROTÓTIPO: duas variantes da tela de Corridas na própria rota, via ?variant=.
// A = tela atual (baseline). B = foco/uma por vez + colunas R$/km. A barra de
// troca só aparece fora de produção. Plano: ~/.claude/plans/snuggly-chasing-fog.md
const VARIANTES = [
  { key: "A", nome: nomeA },
  { key: "B", nome: nomeB },
];

export default async function ParceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const atual = VARIANTES.some((v) => v.key === variant) ? variant! : "A";

  const user = await getUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas 0039 fora dos tipos gerados
  const db = supabase as any;

  const { data: parceiro } = await db
    .from("parceiros_logisticos")
    .select("id, status, nome, cep_base")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!parceiro) {
    return (
      <div className="space-y-6">
        <PageTitle title="Corridas" subtitle="Fretes avulsos sob demanda" />
        <VazioBox>
          Você ainda não tem cadastro de parceiro logístico.{" "}
          <Link href="/parceiro/cadastro" className="text-sinal-escuro font-semibold underline">
            Cadastre-se aqui
          </Link>{" "}
          para ver e aceitar corridas.
        </VazioBox>
      </div>
    );
  }

  if (parceiro.status !== "Aprovado") {
    return (
      <div className="space-y-6">
        <PageTitle title="Corridas" subtitle="Fretes avulsos sob demanda" />
        <VazioBox>
          Seu cadastro está <strong>{parceiro.status}</strong>. Assim que o
          marketplace aprovar, as corridas disponíveis aparecerão aqui.
        </VazioBox>
      </div>
    );
  }

  const { data: corridas } = await db
    .from("corridas")
    .select("*")
    .in("status", ["Publicada", "Aceita", "Coletada", "EmTransito"])
    .order("janela_inicio", { ascending: true });

  const lista = (corridas ?? []) as Corrida[];
  const disponiveis = lista
    .filter((c) => c.status === "Publicada")
    .sort((a, b) => distanciaCep(a.origem_cep, parceiro.cep_base) - distanciaCep(b.origem_cep, parceiro.cep_base));
  const minhas = lista.filter((c) => c.parceiro_id === parceiro.id);

  const { data: rotasData } = await db
    .from("rotas")
    .select("id, origem_cep, destino_cep, frete_calculado, status")
    .eq("parceiro_id", parceiro.id)
    .in("status", ["Atribuida", "EmTransito"])
    .order("criado_em", { ascending: true });
  const rotas = (rotasData ?? []) as Rota[];

  const props = { nome: parceiro.nome as string, disponiveis, minhas, rotas };

  return (
    <>
      {atual === "B" ? <VariantB {...props} /> : <VariantA {...props} />}
      <PrototypeSwitcher variants={VARIANTES} current={atual} />
    </>
  );
}
