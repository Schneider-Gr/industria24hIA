"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Árvore de categorias (taxonomia_nos: Google + Martins + nós locais) no
// cadastro do produto. Navega nível a nível para não baixar 6 mil nós, e
// sugere nó e subcategoria a partir do nome (taxonomia_sugerir, 0188).
// O nó escolhido é classificação de catálogo; a comissão continua vindo da
// categoria/subcategoria (0180) até o Milestone 3 do PRD 041.

type No = { id: string; nome: string };
type Sugestao = { tipo: string; id: string; caminho: string; categoria_id: string | null };

const nomeDe = (n: { nome: string; apelido: string | null }) => n.apelido || n.nome;

// Reconstrói o caminho subindo pelos pais (a árvore tem no máximo 7 níveis).
async function carregarTrilha(id: string): Promise<No[]> {
  const supabase = createClient();
  const trilha: No[] = [];
  let cursor: string | null = id;
  while (cursor && trilha.length < 10) {
    const { data }: { data: { id: string; nome: string; apelido: string | null; parent_id: string | null } | null } =
      await supabase
        .from("taxonomia_nos")
        .select("id, nome, apelido, parent_id")
        .eq("id", cursor)
        .maybeSingle();
    if (!data) break;
    trilha.unshift({ id: data.id, nome: nomeDe(data) });
    cursor = data.parent_id;
  }
    return trilha;
}

export function TaxonomiaPicker({
  noInicial,
  lerNome,
  onSugerirSubcategoria,
  inputCls,
}: {
  noInicial?: string | null;
  /** Nome atual do produto no form, base da sugestão. */
  lerNome: () => string;
  onSugerirSubcategoria: (categoriaId: string, subcategoriaId: string) => void;
  inputCls: string;
}) {
  const [caminho, setCaminho] = useState<No[]>([]);
  const [filhos, setFilhos] = useState<No[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const atual = caminho.at(-1)?.id ?? null;

  // Filhos do nó atual (raízes quando nada foi escolhido).
  useEffect(() => {
    const supabase = createClient();
    let q = supabase
      .from("taxonomia_nos")
      .select("id, nome, apelido")
      .eq("selecionavel", true)
      .eq("obsoleto", false)
      .order("nome");
    q = atual ? q.eq("parent_id", atual) : q.is("parent_id", null);
    q.then(({ data }) => setFilhos((data ?? []).map((n) => ({ id: n.id, nome: nomeDe(n) }))));
  }, [atual]);

  async function irPara(id: string) {
    setCaminho(await carregarTrilha(id));
  }

  useEffect(() => {
    if (noInicial) carregarTrilha(noInicial).then(setCaminho);
  }, [noInicial]);

  async function sugerir() {
    const nome = lerNome().trim();
    if (!nome) {
      setSugestoes([]);
      return;
    }
    setCarregando(true);
    const { data } = await createClient().rpc("taxonomia_sugerir", { p_texto: nome, p_limite: 5 });
    setCarregando(false);
    const lista = (data ?? []) as Sugestao[];
    setSugestoes(lista);
    // A melhor subcategoria já vem preenchida; o seller pode trocar no select.
    const sub = lista.find((s) => s.tipo === "subcategoria" && s.categoria_id);
    if (sub?.categoria_id) onSugerirSubcategoria(sub.categoria_id, sub.id);
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-2">Árvore de categorias</span>
        <button
          type="button"
          onClick={sugerir}
          disabled={carregando}
          className="rounded border border-aco-800/40 px-2 py-1 text-xs hover:bg-aco-100 disabled:opacity-50"
        >
          {carregando ? "Sugerindo..." : "Sugerir pelo nome"}
        </button>
      </div>

      <input type="hidden" name="taxonomia_no_id" value={atual ?? ""} />

      <nav aria-label="Caminho na árvore" className="flex flex-wrap items-center gap-1 text-xs">
        <button type="button" onClick={() => setCaminho([])} className="underline">
          Início
        </button>
        {caminho.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            <span aria-hidden>›</span>
            <button type="button" onClick={() => setCaminho(caminho.slice(0, i + 1))} className="underline">
              {n.nome}
            </button>
          </span>
        ))}
      </nav>

      {filhos.length > 0 && (
        <select
          aria-label={atual ? "Subnível" : "Categoria raiz"}
          value=""
          onChange={(e) => {
            const f = filhos.find((x) => x.id === e.target.value);
            if (f) setCaminho([...caminho, f]);
          }}
          className={inputCls}
        >
          <option value="">{atual ? `Detalhar (${filhos.length})` : "Escolha a categoria"}</option>
          {filhos.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      )}

      {sugestoes && (
        <div className="space-y-1">
          {sugestoes.length === 0 && <p className="text-xs text-muted">Nenhuma sugestão para este nome.</p>}
          {sugestoes
            .filter((s) => s.tipo === "no")
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void irPara(s.id)}
                className="block w-full rounded border border-aco-800/40 px-2 py-1 text-left text-xs hover:bg-aco-100"
              >
                {s.caminho}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
