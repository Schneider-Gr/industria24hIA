import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { notFound } from "next/navigation";

// Página pública que renderiza um documento do CMS (paginas_cms, RLS de leitura
// pública). Usada para os Termos de Serviço dos afiliados; conteudo_rich é texto
// plano, exibido com whitespace-pre-wrap (sem lib de markdown).
//
// `revalidate = 60` foi removido de propósito: com ISR, um slug inexistente saía
// da Vercel como HTTP 200 servindo o corpo da página 404 (soft-404), embora
// `notFound()` rodasse e o mesmo build devolvesse 404 correto em `next start`.
// Soft-404 faz buscador indexar a URL inválida como boa. Termo é documento
// jurídico raramente alterado e a leitura é uma query indexada por slug, então o
// cache de 60s valia pouco perto do status errado.
export const dynamic = "force-dynamic";

export default async function TermosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: pagina, error } = await supabase
    .from("paginas_cms")
    .select("titulo, conteudo_rich")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return <ErrorState title="Falha ao carregar a página" detail={error.message} />;
  }

  if (!pagina) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-6">
        {pagina.titulo}
      </h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {pagina.conteudo_rich}
      </div>
    </main>
  );
}
