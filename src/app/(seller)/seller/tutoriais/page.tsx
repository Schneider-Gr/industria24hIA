import { PageTitle } from "@/components/seller/states";
import { TourTrigger } from "@/components/seller/TourGuiado";

// Conteúdo real extraído do painel Bubble em 2026-07-10 (tela "tutoriais",
// compartilhada pelos menus Tutoriais e Central de Dúvidas). Todos os itens
// apontam hoje para o mesmo vídeo no app real.
const VIDEO = "https://www.youtube.com/embed/bNtxiKWtO34?rel=0";

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
        titulo: "Como cadastrar venda futura",
        descricao: "Orientações sobre cadastro de venda futura.",
        video: VIDEO,
      },
      {
        titulo: "Como cadastrar desconto progressivo",
        descricao: "Orientação sobre cadastro de desconto progressivo.",
        video: VIDEO,
      },
    ],
  },
  {
    titulo: "Dúvidas",
    itens: [
      {
        titulo: "Afiliados",
        descricao: "Como funcionam as afiliações.",
        video: VIDEO,
      },
      {
        titulo: "Como editar venda futura",
        descricao: "Complemento.",
        video: VIDEO,
      },
      {
        titulo: "Como editar desconto progressivo",
        descricao: "Complemento.",
        video: VIDEO,
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
          <h2 className="mb-3 font-display text-24 font-semibold text-aco-900">
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
