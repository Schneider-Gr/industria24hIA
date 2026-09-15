import { PageTitle } from "@/components/seller/states";
import { TourTrigger } from "@/components/seller/TourGuiado";

// Conteúdo real extraído do painel Bubble em 2026-07-10 (tela "tutoriais",
// compartilhada pelos menus Tutoriais e Central de Dúvidas). Vídeos do canal
// youtube.com/@Industria24h; cadastro de produto não tem vídeo próprio e usa o geral.
const yt = (id: string) => `https://www.youtube.com/embed/${id}?rel=0`;
const VIDEO = yt("bNtxiKWtO34");

const SECOES: Array<{
  titulo: string;
  itens: Array<{ titulo: string; descricao: string; video: string }>;
}> = [
  {
    titulo: "Visão Geral",
    itens: [
      {
        titulo: "Visão Geral da Plataforma",
        descricao: "Um breve tour por nossas funcionalidades.",
        video: VIDEO,
      },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      {
        titulo: "Como cadastrar um produto",
        descricao: "Orientações sobre cadastro de produtos.",
        video: VIDEO,
      },
      {
        titulo: "Como criar um cupom de desconto",
        descricao: "Cupom geral criado pelo menu Produtos e usado no checkout.",
        video: yt("Shi_aHbJCDk"),
      },
      {
        titulo: "Como cadastrar venda futura",
        descricao: "Orientações sobre cadastro de venda futura.",
        video: yt("yWzhpeKz4lk"),
      },
      {
        titulo: "Como cadastrar desconto progressivo",
        descricao: "Orientação sobre cadastro de desconto progressivo.",
        video: yt("RE1IrrKDyU8"),
      },
    ],
  },
  {
    titulo: "Pedidos",
    itens: [
      {
        titulo: "Como receber o pedido e confirmar a entrega",
        descricao: "Separar, entregar e lançar o código do comprador para liberar o pagamento.",
        video: yt("O1q9tL-WJyw"),
      },
    ],
  },
  {
    titulo: "Dúvidas",
    itens: [
      {
        titulo: "Afiliados",
        descricao: "Como funcionam as afiliações.",
        video: yt("CYtpm0q5o7w"),
      },
      {
        titulo: "Como editar venda futura",
        descricao: "Complemento.",
        video: yt("yWzhpeKz4lk"),
      },
      {
        titulo: "Como editar desconto progressivo",
        descricao: "Complemento.",
        video: yt("RE1IrrKDyU8"),
      },
    ],
  },
];

export default function TutoriaisPage() {
  return (
    <div>
      <PageTitle title="Tutoriais" subtitle="Aprenda a usar o painel do lojista" />
      <div className="mb-6">
        <TourTrigger />
      </div>
      {SECOES.map((secao) => (
        <section key={secao.titulo} className="mb-8">
          <h2 className="mb-3 font-display text-[13px] font-medium uppercase tracking-[0.08em] text-aco-900">
            {secao.titulo}
          </h2>
          <div className="space-y-3">
            {secao.itens.map((item) => (
              <details
                key={item.titulo}
                className="rounded border border-line bg-surface p-4"
              >
                <summary className="cursor-pointer">
                  <span className="font-semibold text-ink">{item.titulo}</span>
                  <span className="ml-2 text-sm text-muted">{item.descricao}</span>
                </summary>
                <div className="mt-4 aspect-video max-w-2xl">
                  <iframe
                    src={item.video}
                    title={item.titulo}
                    className="h-full w-full rounded"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
