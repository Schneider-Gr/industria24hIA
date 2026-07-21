import type { Metadata } from "next";
import { NavDocs, Secao, Bloco, Cod, Tabela } from "@/components/docs/ui";

export const metadata: Metadata = {
  title: "Rastreio em tempo real | Desenvolvedores",
  description:
    "Como a Indústria 24h expõe a posição das corridas de logística e como isso se alinha ao padrão de rastreio veicular do mercado.",
};

export default function RastreamentoPage() {
  return (
    <>
      <h1 className="mb-6 font-archivo text-3xl font-extrabold text-aco-900">
        Rastreio em tempo real
      </h1>
      <NavDocs atual="/desenvolvedores/rastreamento" />

      <Secao titulo="O modelo">
        <p>
          Rastreio veicular no mercado logístico se organiza em quatro camadas, e adotamos o mesmo
          vocabulário para quem já integra outros marketplaces não precisar traduzir nada:
        </p>
        <Tabela
          cabecalho={["Camada", "O que é", "Na Indústria 24h"]}
          linhas={[
            ["transport", "O veículo ou pessoa que transporta", "A corrida, com origem, destino e status"],
            ["device", "O GPS, celular ou rastreador embarcado", "O parceiro logístico atribuído à corrida"],
            ["location", "Latitude, longitude e o instante da leitura", "Cada registro de posição da corrida"],
            ["telemetry / event", "Velocidade, odômetro, frenagem brusca", "Não coletado hoje"],
          ]}
        />
      </Secao>

      <Secao titulo="O que existe hoje">
        <p>
          O aplicativo do parceiro registra a posição durante a corrida, a partir do momento em que
          a carga é coletada e enquanto ela está em trânsito. Cada posição guarda latitude,
          longitude e data. Você lê isso pela ferramenta{" "}
          <Cod>industria24_rastrear_corrida</Cod>, que devolve as posições da mais recente para a
          mais antiga.
        </p>
        <Bloco>{`{
  "transport": {
    "id": "9f1c...",
    "status": "EmTransito",
    "origem": "Av. das Torres, 1200 - Manaus",
    "destino": "R. Recife, 45 - Manaus",
    "pedido_id": "3f9u..."
  },
  "device": {
    "external_entity_id": "b71a...",
    "external_entity_type": "PARCEIRO_LOGISTICO"
  },
  "locations": [
    {
      "latitude": -3.101944,
      "longitude": -60.025,
      "timestamp": 1768900861,
      "date": "2026-07-20T14:41:01.000Z"
    }
  ]
}`}</Bloco>
        <p>
          <Cod>timestamp</Cod> é em segundos desde 1970 (UTC), o formato usado pelos padrões de
          rastreio; <Cod>date</Cod> é o mesmo instante em ISO 8601, para quem preferir.
        </p>
      </Secao>

      <Secao titulo="Estados da corrida">
        <p>
          Posições só existem entre <Cod>Coletada</Cod> e <Cod>Entregue</Cod>. Antes disso a lista
          vem vazia, e isso não é erro.
        </p>
        <Bloco>{`Publicada → Aceita → Coletada → EmTransito → Entregue
                                    ↘ Cancelada`}</Bloco>
      </Secao>

      <Secao titulo="Frequência e uso">
        <ul className="space-y-2">
          <li>
            A cadência das posições depende do parceiro em rota; trate a lista como esparsa e use
            sempre o <Cod>timestamp</Cod> para saber a idade do dado.
          </li>
          <li>
            Para acompanhar uma entrega, faça polling da corrida a cada poucos minutos. Não há
            webhook de posição hoje.
          </li>
          <li>
            Para o rastreio comercial do pedido (código de rastreio, transportadora), use{" "}
            <Cod>industria24_listar_registros</Cod> na tabela <Cod>entregas</Cod>.
          </li>
        </ul>
      </Secao>

      <Secao titulo="No roteiro">
        <p>
          O padrão completo de rastreio veicular prevê ainda registro de dispositivo com marca e
          modelo, comandos de início e parada de monitoramento, envio de rotas planejadas com
          paradas e janelas, telemetria (velocidade, odômetro, combustível, bateria) e eventos de
          direção como frenagem brusca ou excesso de velocidade. Nada disso está implementado: só
          faz sentido quando houver frota instrumentada ou um contrato que exija esse nível de
          detalhe. O formato de resposta acima já foi desenhado para receber esses campos sem
          quebrar quem integrar agora.
        </p>
      </Secao>
    </>
  );
}
