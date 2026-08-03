import Link from "next/link";
import { VitrineHeader, VitrineFooter } from "@/components/vitrine/ui";
import { FormularioCadastro } from "@/components/vitrine/FormularioCadastro";

// Cadastro público de vendedor. Vive fora do route group (seller) de propósito:
// o layout de /seller embrulha tudo no shell do painel, e esta página precisa
// renderizar deslogada (é o destino de /vender).
export default function SellerCadastroPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="anim-entra mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-ink">
          Vender no 24h
        </h1>
        <p className="mt-1 text-sm text-muted">
          Crie sua conta. Depois de confirmar o e-mail, você cadastra sua
          loja — ela entra em análise e só aparece no marketplace após
          aprovação.
        </p>

        <FormularioCadastro
          next="/seller/minha-loja"
          tituloEnviado="Confirme seu e-mail"
          mensagemEnviado="Enviamos um link de confirmação. Depois de confirmar, você poderá cadastrar sua loja — ela fica em análise até um admin aprovar."
        />

        <p className="mt-4 text-center text-[13px] text-muted">
          Só quer comprar?{" "}
          <Link href="/cadastro" className="text-lm-azul underline-offset-2 hover:underline">
            Crie sua conta aqui
          </Link>
        </p>
      </main>
      <VitrineFooter />
    </div>
  );
}
