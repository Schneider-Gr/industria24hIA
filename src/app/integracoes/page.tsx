import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { Bloco, Passo } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "Integração via MCP",
  description:
    "Integre o catálogo, pedidos e módulos da Indústria 24h ao seu sistema via MCP — leitura livre, edição com credencial aprovada.",
};

// Página estática (documentação). Passo a passo do usuário final para conectar
// um sistema/agente ao marketplace via MCP. A referência técnica fica em
// /desenvolvedores; Bloco e Passo são compartilhados pelas duas.
export default function IntegracoesPage() {
  return (
    <div className="min-h-screen bg-white">
      <VitrineHeader />

      <main className="mx-auto max-w-[880px] px-4 py-10 sm:px-6">
        <header className="mb-10">
          <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
            Para desenvolvedores e parceiros
          </p>
          <h1 className="mt-2 font-archivo text-3xl font-extrabold text-aco-900 sm:text-4xl">
            Integração via MCP
          </h1>
          <p className="mt-4 text-aco-800">
            Conecte seu ERP, PIM, sistema de logística ou um agente de IA (Claude,
            n8n, ferramentas próprias) ao marketplace da Indústria 24h usando o{" "}
            <strong>MCP (Model Context Protocol)</strong>. Você <strong>lê</strong>{" "}
            catálogo, lojas, pedidos e entregas com um token; para <strong>editar</strong>{" "}
            é preciso uma segunda credencial (escopo de escrita), aprovada pela nossa
            equipe, para proteger a plataforma.
          </p>
        </header>

        <section className="mb-10 rounded-sm border border-aco-100 bg-aco-100 p-5">
          <h2 className="font-archivo text-lg font-bold text-aco-900">O que dá para fazer</h2>
          <ul className="mt-3 space-y-2 text-aco-800">
            <li>
              <strong>Ler</strong> (token de leitura): produtos, lojas, categorias,
              pedidos, entregas, promoções, afiliações e centros de distribuição.
            </li>
            <li>
              <strong>Editar</strong> (token de escrita, aprovado): catálogo da sua loja
              (nome, descrição, preço, estoque) e status de pedidos e entregas.
            </li>
            <li>
              Você nunca edita dados de outra loja, nem toca em campos financeiros
              (repasse, comissão, chave PIX).
            </li>
          </ul>
        </section>

        <h2 className="mb-6 font-archivo text-2xl font-extrabold text-aco-900">
          Passo a passo
        </h2>

        <ol className="space-y-8">
          <Passo n={1} titulo="Solicite seu acesso">
            <p className="text-aco-800">
              Fale com nossa equipe (contato no rodapé) informando o nome da empresa e a
              loja que você representa. Você recebe um <strong>token de leitura</strong>{" "}
              começando com <code className="rounded bg-aco-100 px-1">i24_read_</code>.
            </p>
          </Passo>

          <Passo n={2} titulo="Configure no seu cliente MCP">
            <p className="text-aco-800">
              No Claude Desktop, Claude Code, n8n ou no seu agente, adicione o servidor
              remoto e o seu token:
            </p>
            <Bloco>{`{
  "mcpServers": {
    "industria24": {
      "type": "http",
      "url": "https://mcp.industria24.com.br/mcp",
      "headers": { "Authorization": "Bearer i24_read_SEU_TOKEN" }
    }
  }
}`}</Bloco>
          </Passo>

          <Passo n={3} titulo="Leia os dados">
            <p className="text-aco-800">
              Peça ao seu agente, por exemplo: <em>“liste os produtos da minha loja”</em>{" "}
              ou <em>“qual o status do pedido 3F9U882N5J?”</em>. As ferramentas de leitura
              disponíveis:
            </p>
            <ul className="text-aco-800">
              <li><code className="rounded bg-aco-100 px-1">industria24_listar_registros</code> — lista paginada de qualquer tabela.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_buscar_registro</code> — um registro por id.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_buscar_produtos</code> — busca por nome.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_rastrear_corrida</code> — posições GPS de uma entrega em curso.</li>
            </ul>
          </Passo>

          <Passo n={4} titulo="Peça o acesso de escrita (opcional)">
            <p className="text-aco-800">
              Para sincronizar catálogo ou atualizar status de pedidos, solicite o{" "}
              <strong>token de escrita</strong>{" "}
              (<code className="rounded bg-aco-100 px-1">i24_write_</code>). Ele é emitido
              só após aprovação da nossa equipe e vale apenas para a sua loja. Troque o
              token no header <code className="rounded bg-aco-100 px-1">Authorization</code>{" "}
              pelo de escrita.
            </p>
          </Passo>

          <Passo n={5} titulo="Edite com segurança">
            <p className="text-aco-800">Ferramentas de escrita (exigem token aprovado):</p>
            <ul className="text-aco-800">
              <li><code className="rounded bg-aco-100 px-1">industria24_atualizar_produto</code> — nome, descrição, preço, sku.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_atualizar_estoque</code> — estoque atual.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_atualizar_status_pedido</code> — status do pedido.</li>
              <li><code className="rounded bg-aco-100 px-1">industria24_atualizar_entrega</code> — status e rastreio da entrega.</li>
            </ul>
            <p className="text-aco-800">
              Toda edição é registrada em auditoria. Um token vazado pode ser revogado a
              qualquer momento — nunca compartilhe ou versione seu token.
            </p>
          </Passo>

          <Passo n={6} titulo="Acompanhe a entrega em tempo real">
            <p className="text-aco-800">
              Enquanto a carga está em rota, o parceiro logístico registra a posição pelo
              aplicativo. Peça <em>“onde está a corrida X?”</em> e você recebe as últimas
              coordenadas com data e hora, no mesmo formato usado pelos padrões de rastreio
              veicular do mercado (<code className="rounded bg-aco-100 px-1">transport</code>,{" "}
              <code className="rounded bg-aco-100 px-1">device</code>,{" "}
              <code className="rounded bg-aco-100 px-1">locations</code>).
            </p>
            <Bloco>{`{
  "transport": { "id": "9f1c...", "status": "EmTransito" },
  "device": { "external_entity_type": "PARCEIRO_LOGISTICO" },
  "locations": [
    { "latitude": -3.101944, "longitude": -60.025,
      "date": "2026-07-20T14:41:01.000Z" }
  ]
}`}</Bloco>
            <p className="text-aco-800">
              Posições existem entre a coleta e a entrega, na cadência do parceiro em rota —
              trate a lista como esparsa. Detalhes em{" "}
              <Link href="/desenvolvedores/rastreamento" className="text-sinal underline">
                Rastreio em tempo real
              </Link>
              .
            </p>
          </Passo>
        </ol>

        <section className="mt-12">
          <h2 className="mb-2 font-archivo text-2xl font-extrabold text-aco-900">
            Documentação completa
          </h2>
          <p className="mb-5 text-aco-800">
            Tudo que existe sobre a integração MCP da Indústria 24h está nestas quatro páginas.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: "/desenvolvedores",
                titulo: "Visão geral",
                resumo: "Endpoint, modelo de acesso, configuração do cliente MCP.",
              },
              {
                href: "/desenvolvedores/autenticacao",
                titulo: "Autenticação",
                resumo:
                  "Tokens de leitura e escrita, escopos, limites de edição, revogação.",
              },
              {
                href: "/desenvolvedores/referencia",
                titulo: "Referência das ferramentas",
                resumo:
                  "Parâmetros, retorno, tabelas legíveis, paginação e códigos de erro.",
              },
              {
                href: "/desenvolvedores/rastreamento",
                titulo: "Rastreio em tempo real",
                resumo:
                  "Modelo transport/device/location, estados da corrida e o que vem depois.",
              },
            ].map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="block h-full rounded-sm border border-aco-100 p-4 hover:border-aco-900"
                >
                  <span className="font-archivo font-bold text-aco-900">{p.titulo}</span>
                  <span className="mt-1 block text-sm text-aco-800">{p.resumo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-sm border border-aco-100 bg-aco-100 p-5">
          <h2 className="font-archivo text-lg font-bold text-aco-900">Segurança em resumo</h2>
          <ul className="mt-3 space-y-2 text-aco-800">
            <li>Dois tokens separados: leitura e escrita. Escrita só com aprovação.</li>
            <li>Cada token vale só para a sua loja; edição de terceiros é bloqueada.</li>
            <li>Nenhuma chave do nosso banco de dados é entregue a você.</li>
            <li>
              Parâmetros, erros, paginação e rastreio em tempo real:{" "}
              <Link href="/desenvolvedores" className="text-sinal underline">
                documentação para desenvolvedores
              </Link>
              .
            </li>
          </ul>
        </section>
      </main>

      <VitrineFooter />
    </div>
  );
}
