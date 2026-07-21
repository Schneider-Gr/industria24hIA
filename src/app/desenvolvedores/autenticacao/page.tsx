import type { Metadata } from "next";
import { NavDocs, Secao, Bloco, Cod, Tabela } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "Autenticação | Desenvolvedores",
  description:
    "Tokens de leitura e escrita do MCP da Indústria 24h: emissão, escopos, ownership por loja e revogação.",
};

export default function AutenticacaoPage() {
  return (
    <>
      <h1 className="mb-6 font-archivo text-3xl font-extrabold text-aco-900">Autenticação</h1>
      <NavDocs atual="/desenvolvedores/autenticacao" />

      <Secao titulo="Dois tokens, dois escopos">
        <Tabela
          cabecalho={["Prefixo", "Escopo", "Pode", "Emissão"]}
          linhas={[
            [
              <Cod key="r">i24_read_</Cod>,
              "read",
              "Ler todas as tabelas liberadas",
              "Sob pedido, sem aprovação especial",
            ],
            [
              <Cod key="w">i24_write_</Cod>,
              "write",
              "Ler tudo + editar catálogo e status da própria loja",
              "Só após aprovação da equipe",
            ],
          ]}
        />
        <p>
          O token vai no header <Cod>Authorization</Cod> como Bearer. Ele é guardado no nosso
          banco apenas como hash SHA-256: se você perder o valor, emitimos outro, não recuperamos
          o antigo.
        </p>
        <Bloco>{`Authorization: Bearer i24_write_SEU_TOKEN`}</Bloco>
      </Secao>

      <Secao titulo="O que o token carrega">
        <ul className="space-y-2">
          <li>
            <strong>loja_id</strong> — toda escrita é filtrada por ele. Tentar editar produto ou
            pedido de outra loja devolve &ldquo;não pertence à sua loja&rdquo;, não os dados.
          </li>
          <li>
            <strong>escopo</strong> — <Cod>write</Cod> inclui <Cod>read</Cod>; o contrário não.
          </li>
          <li>
            <strong>validade</strong> — data de aprovação, de expiração e de revogação. Um token
            revogado para de funcionar na chamada seguinte.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Limites de escrita">
        <p>Mesmo com token aprovado, alguns campos nunca são editáveis pela API:</p>
        <ul className="space-y-2">
          <li>Valores financeiros: repasse, comissão de afiliado, valor do pedido, chave PIX.</li>
          <li>
            <Cod>status_produto</Cod> — moderação de catálogo é decisão da plataforma.
          </li>
          <li>Status do parceiro logístico e aprovação de loja.</li>
        </ul>
        <p>
          As mesmas travas existem no banco por trigger, então uma tentativa por outro caminho
          também falha. Módulos de escrita são ligados gradualmente: se o seu ainda não está
          habilitado, a ferramenta responde com o motivo em vez de gravar.
        </p>
      </Secao>

      <Secao titulo="Boas práticas">
        <ul className="space-y-2">
          <li>Nunca versione o token nem cole em chat, issue ou log.</li>
          <li>Use o token de leitura no que for leitura; guarde o de escrita para o job que grava.</li>
          <li>Ao suspeitar de vazamento, peça revogação — é imediata e não afeta seus dados.</li>
        </ul>
      </Secao>
    </>
  );
}
