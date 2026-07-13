import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { getUser } from "@/lib/auth";
import { PrecisaLogin } from "@/components/seller/states";
import { publicarCorrida } from "../actions";

const inputCls =
  "mt-1 w-full rounded border border-borda px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-300";

export default async function NovaCorridaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  return (
    <>
      <VitrineHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-ink">Chamar motorista</h1>
        <p className="mt-1 text-sm text-muted">
          Publique uma corrida avulsa de retirada e entrega de carga. Motoristas e
          transportadoras da região aceitam na hora ou dão lances de frete.
        </p>

        <form action={publicarCorrida} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-2">CEP de origem *</span>
              <input name="origem_cep" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Endereço de origem *</span>
              <input name="origem_endereco" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">CEP de destino *</span>
              <input name="destino_cep" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Endereço de destino *</span>
              <input name="destino_endereco" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Peso (kg) *</span>
              <input name="peso_kg" type="number" step="0.01" min="0.01" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Volume (m³)</span>
              <input name="volume_m3" type="number" step="0.01" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Início da janela *</span>
              <input name="janela_inicio" type="datetime-local" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Fim da janela *</span>
              <input name="janela_fim" type="datetime-local" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Urgência</span>
              <select name="urgencia" className={inputCls}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Como fechar o frete</span>
              <select name="modo" className={inputCls}>
                <option value="primeiro_aceita">Primeiro a aceitar leva</option>
                <option value="leilao">Leilão reverso (menor lance)</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-ink-2">Descrição da carga</span>
            <textarea name="descricao_carga" rows={2} className={inputCls} />
          </label>
          <button
            type="submit"
            className="rounded bg-laranja px-5 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro"
          >
            Publicar corrida
          </button>
        </form>
      </main>
      <VitrineFooter />
    </>
  );
}
