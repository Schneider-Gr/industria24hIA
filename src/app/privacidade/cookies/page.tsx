import type { Metadata } from "next";
import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { PreferenciasCookies } from "./PreferenciasCookies";

export const metadata: Metadata = { title: "Cookies e personalização | Indústria 24h" };

// Regra de LGPD da vitrine personalizada (18/09/2026). Texto informativo do
// produto; a Política de Privacidade completa segue no CMS
// (/termos/politica-de-privacidade) e deve ganhar remissão a esta página.
const COOKIES = [
  ["cep_comprador", "Essencial", "Seu CEP, para mostrar só o que entrega no seu endereço.", "Até você trocar o CEP"],
  ["Sessão (sb-*)", "Essencial", "Mantém você conectado à sua conta.", "Enquanto durar a sessão"],
  ["afiliado_ref", "Essencial", "Identifica o afiliado que indicou a compra, para pagar a comissão dele.", "30 dias"],
  ["Carrinho (armazenamento local)", "Essencial", "Os itens do seu carrinho, guardados no navegador.", "Até você finalizar ou limpar"],
  ["consent_cookies", "Essencial", "Guarda a sua escolha neste aviso.", "1 ano"],
  ["_fbp (Meta Pixel)", "Marketing", "Mede visitas às páginas de captação de vendedores para anúncios da Meta. Só nessas páginas.", "90 dias"],
  ["YouTube (vídeo da Venda Futura)", "Terceiro", "O player do YouTube grava cookies próprios ao exibir o vídeo da Venda Futura na home e na página /venda-futura.", "Definido pelo YouTube"],
  ["hist_busca", "Personalização", "Suas 5 últimas buscas, para montar a vitrine “Porque você buscou”.", "90 dias"],
] as const;

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Cookies e personalização</h1>
        <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
          A Indústria 24h usa cookies essenciais para o site funcionar. Com a sua permissão, usa também o seu
          histórico de buscas para mostrar produtos do seu interesse. Você pode mudar essa escolha ou apagar o
          histórico a qualquer momento nesta página.
        </p>

        <h2 className="mt-8 font-display text-lg font-bold text-ink">O que guardamos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="border-b border-line text-ink-2">
              <tr>
                <th className="py-2 pr-4 font-semibold">Cookie</th>
                <th className="py-2 pr-4 font-semibold">Tipo</th>
                <th className="py-2 pr-4 font-semibold">Para quê</th>
                <th className="py-2 font-semibold">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map(([nome, tipo, para, prazo]) => (
                <tr key={nome} className="border-b border-line align-top">
                  <td className="py-2 pr-4 font-mono text-[12px] text-ink">{nome}</td>
                  <td className="py-2 pr-4 text-ink">{tipo}</td>
                  <td className="py-2 pr-4 text-ink-2">{para}</td>
                  <td className="py-2 text-ink-2">{prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 font-display text-lg font-bold text-ink">Regras que seguimos (LGPD)</h2>
        <ul className="mt-3 max-w-[65ch] list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-2">
          <li>
            O histórico de buscas só é gravado depois que você escolhe <strong>Aceitar todos</strong> (consentimento,
            art. 7º, I). O mesmo vale para o cookie de marketing da Meta. Sem escolha, ou com{" "}
            <strong>Só essenciais</strong>, nenhum dos dois é gravado.
          </li>
          <li>
            O histórico fica no seu navegador. Nosso servidor só o lê para montar a sua vitrine: não grava em banco,
            não vincula ao seu cadastro e não compartilha com terceiros.
          </li>
          <li>Guardamos no máximo as 5 últimas buscas, por até 90 dias.</li>
          <li>
            O vídeo da Venda Futura é exibido pelo YouTube, que grava cookies próprios assim que a página carrega.
            Para não recebê-los, bloqueie cookies de terceiros no seu navegador; o restante do site continua
            funcionando.
          </li>
          <li>
            Você pode revogar o consentimento ou apagar o histórico quando quiser (art. 18), com efeito imediato.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-lg font-bold text-ink">Sua escolha</h2>
        <div className="mt-3">
          <PreferenciasCookies />
        </div>

        <p className="mt-8 text-[13px] text-ink-2">
          Veja também a{" "}
          <Link href="/termos/politica-de-privacidade" className="font-semibold text-lm-azul underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </p>
      </main>
      <VitrineFooter />
    </div>
  );
}
