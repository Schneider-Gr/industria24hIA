import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { FormularioCadastro } from "@/components/vitrine/FormularioCadastro";

// Cadastro público de comprador — mesma conta genérica de /seller/cadastro,
// só muda o texto e o destino pós-confirmação (home, não painel do vendedor).
export default function CadastroPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="anim-entra mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-muted">
          Crie sua conta para comprar na Indústria 24h. A mesma conta também
          serve caso queira vender, ser afiliado ou parceiro logístico depois.
        </p>

        <FormularioCadastro
          next="/"
          tituloEnviado="Confirme seu e-mail"
          mensagemEnviado="Enviamos um link de confirmação. Depois de confirmar, você já pode comprar."
        />

        <p className="mt-4 text-center text-[13px] text-muted">
          Quer vender no 24h?{" "}
          <Link href="/seller/cadastro" className="text-lm-azul underline-offset-2 hover:underline">
            Cadastre sua loja
          </Link>
        </p>
      </main>
      <VitrineFooter />
    </div>
  );
}
