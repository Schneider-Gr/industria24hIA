import type { Metadata } from "next";
import Link from "next/link";
import { NavDocs, Secao, Bloco, Cod } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "Desenvolvedores",
  description:
    "Documentação técnica da Indústria 24h: MCP, autenticação por token, referência das ferramentas e rastreio de entregas em tempo real.",
};

export default function DesenvolvedoresPage() {
  return (
    <>
      <header className="mb-8">
        <p className="font-archivo text-sm font-bold uppercase tracking-wide text-sinal">
          Documentação técnica
        </p>
        <h1 className="mt-2 font-archivo text-3xl font-extrabold text-aco-900 sm:text-4xl">
          Desenvolvedores
        </h1>
        <p className="mt-4 text-aco-800">
          A Indústria 24h expõe catálogo, pedidos, entregas e rastreio por um servidor{" "}
          <strong>MCP (Model Context Protocol)</strong> remoto. Qualquer cliente MCP — Claude,
          n8n, um agente próprio — fala com ele por HTTP com um token Bearer. Se você quer o
          passo a passo sem código, vá para{" "}
          <Link href="/integracoes" className="text-sinal underline">
            Integração via MCP
          </Link>
          .
        </p>
      </header>

      <NavDocs atual="/desenvolvedores" />

      <Secao titulo="Endpoint">
        <p>
          Servidor Streamable HTTP, sem sessão. Cada requisição carrega o próprio token; não há
          handshake a manter.
        </p>
        <Bloco>{`POST https://mcp.industria24.com.br/mcp
Authorization: Bearer i24_read_SEU_TOKEN
Content-Type: application/json`}</Bloco>
        <p>
          Configuração em um cliente MCP:
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
      </Secao>

      <Secao titulo="O modelo em uma tela">
        <ul className="space-y-2">
          <li>
            <strong>Leitura</strong> — token <Cod>i24_read_</Cod>. Produtos, lojas, categorias,
            pedidos, entregas, promoções, afiliações, centros de distribuição, corridas de
            logística e posições GPS.
          </li>
          <li>
            <strong>Escrita</strong> — token <Cod>i24_write_</Cod>, emitido só após aprovação.
            Catálogo da sua loja e status de pedido/entrega. Nunca campos financeiros.
          </li>
          <li>
            <strong>Escopo por loja</strong> — o token carrega um <Cod>loja_id</Cod>. Toda
            escrita é filtrada por ele; dados de outra loja não são alcançáveis.
          </li>
          <li>
            <strong>Auditoria</strong> — cada chamada de escrita fica registrada com token,
            ferramenta, parâmetros e IP.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Por onde seguir">
        <ul className="space-y-2">
          <li>
            <Link href="/desenvolvedores/autenticacao" className="text-sinal underline">
              Autenticação
            </Link>{" "}
            — como obter, usar e revogar tokens.
          </li>
          <li>
            <Link href="/desenvolvedores/referencia" className="text-sinal underline">
              Referência das ferramentas
            </Link>{" "}
            — parâmetros, retorno, paginação e erros.
          </li>
          <li>
            <Link href="/desenvolvedores/rastreamento" className="text-sinal underline">
              Rastreio em tempo real
            </Link>{" "}
            — modelo de rastreio veicular e o que expomos hoje.
          </li>
        </ul>
      </Secao>
    </>
  );
}
