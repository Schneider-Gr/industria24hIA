import type { Metadata } from "next";
import { NavDocs, Secao, Bloco, Cod, Tabela } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "Referência das ferramentas | Desenvolvedores",
  description:
    "Ferramentas MCP da Indústria 24h: parâmetros, retorno, tabelas legíveis, paginação e erros.",
};

export default function ReferenciaPage() {
  return (
    <>
      <h1 className="mb-6 font-archivo text-3xl font-extrabold text-aco-900">
        Referência das ferramentas
      </h1>
      <NavDocs atual="/desenvolvedores/referencia" />

      <Secao titulo="Leitura">
        <Tabela
          cabecalho={["Ferramenta", "Parâmetros", "Retorno"]}
          linhas={[
            [
              <Cod key="a">industria24_listar_registros</Cod>,
              <>
                <Cod>tabela</Cod>, <Cod>limite</Cod> (1&ndash;200, padrão 20), <Cod>offset</Cod>,{" "}
                <Cod>filtro_coluna</Cod>, <Cod>filtro_valor</Cod>
              </>,
              <>
                <Cod>registros</Cod>, <Cod>total_count</Cod>, <Cod>has_more</Cod>,{" "}
                <Cod>next_offset</Cod>
              </>,
            ],
            [
              <Cod key="b">industria24_buscar_registro</Cod>,
              <>
                <Cod>tabela</Cod>, <Cod>id</Cod>
              </>,
              "O registro, ou mensagem de não encontrado",
            ],
            [
              <Cod key="c">industria24_buscar_produtos</Cod>,
              <>
                <Cod>termo</Cod>, <Cod>limite</Cod> (1&ndash;100)
              </>,
              "Produtos cujo nome contém o termo",
            ],
            [
              <Cod key="d">industria24_rastrear_corrida</Cod>,
              <>
                <Cod>corrida_id</Cod>, <Cod>limite</Cod> (1&ndash;200)
              </>,
              <>
                <Cod>transport</Cod>, <Cod>device</Cod>, <Cod>locations</Cod> &mdash; ver{" "}
                Rastreio em tempo real
              </>,
            ],
          ]}
        />
      </Secao>

      <Secao titulo="Tabelas legíveis">
        <p>
          O parâmetro <Cod>tabela</Cod> aceita apenas esta lista. Qualquer outro valor é rejeitado
          antes de chegar ao banco.
        </p>
        <Bloco>{`produtos            lojas               categorias
subcategorias       pedidos             linha_itens
entregas            vendas_futuras      promocoes_progressivas
afiliacoes          centros_distribuicao
corridas            corrida_posicoes`}</Bloco>
      </Secao>

      <Secao titulo="Paginação">
        <p>
          Página por <Cod>offset</Cod>. Enquanto <Cod>has_more</Cod> for verdadeiro, repita a
          chamada com o <Cod>next_offset</Cod> devolvido. <Cod>total_count</Cod> é a contagem
          exata do filtro aplicado.
        </p>
        <Bloco>{`{
  "registros": [ ... ],
  "total_count": 137,
  "has_more": true,
  "next_offset": 20
}`}</Bloco>
      </Secao>

      <Secao titulo="Escrita">
        <p>
          Exigem token <Cod>i24_write_</Cod> aprovado e o módulo correspondente habilitado. Toda
          escrita é filtrada pelo <Cod>loja_id</Cod> do token e registrada em auditoria.
        </p>
        <Tabela
          cabecalho={["Ferramenta", "Parâmetros", "Módulo"]}
          linhas={[
            [
              <Cod key="e">industria24_atualizar_produto</Cod>,
              <>
                <Cod>id</Cod>, <Cod>nome</Cod>, <Cod>descricao</Cod>, <Cod>valor</Cod>,{" "}
                <Cod>sku</Cod>
              </>,
              "catalogo",
            ],
            [
              <Cod key="f">industria24_atualizar_estoque</Cod>,
              <>
                <Cod>id</Cod>, <Cod>estoque_atual</Cod>
              </>,
              "catalogo",
            ],
            [
              <Cod key="g">industria24_atualizar_status_pedido</Cod>,
              <>
                <Cod>id</Cod>, <Cod>status_pedido</Cod>
              </>,
              "pedidos",
            ],
            [
              <Cod key="h">industria24_atualizar_entrega</Cod>,
              <>
                <Cod>linha_item_id</Cod>, <Cod>status</Cod> (Pendente | Enviado | Entregue),{" "}
                <Cod>rastreio</Cod>
              </>,
              "pedidos",
            ],
          ]}
        />
      </Secao>

      <Secao titulo="Erros">
        <p>
          Erros de ferramenta voltam como conteúdo de texto com <Cod>isError</Cod>, no formato{" "}
          <Cod>Erro: mensagem</Cod> — o agente lê e explica. Falha de token acontece antes, no
          HTTP.
        </p>
        <Tabela
          cabecalho={["Situação", "O que você vê"]}
          linhas={[
            ["Token ausente, inválido, expirado ou revogado", "401 no HTTP"],
            ["Token de leitura chamando ferramenta de escrita", "A ferramenta nem aparece na lista"],
            ["Módulo de escrita ainda não habilitado", "Erro explicando qual módulo falta"],
            ["Registro de outra loja", "Erro de não encontrado — nunca os dados"],
            ["Nenhum campo enviado no update", "Erro: nenhum campo para atualizar"],
          ]}
        />
      </Secao>
    </>
  );
}
