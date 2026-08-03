import { ErrorState } from "@/components/ErrorState";

// Estados honestos reutilizados pelas telas do seller. Regra do projeto:
// nunca mockar; sem login/sem loja exibimos um estado real, não dados falsos.

export function PrecisaLogin() {
  return (
    <div className="space-y-4">
      <ErrorState
        title="Faça login"
        detail="Nenhuma sessão ativa. Entre com sua conta para acessar o painel."
      />
      <p className="text-center">
        <a
          href="/login"
          className="text-sm text-aco-600 underline-offset-2 hover:underline dark:text-aco-100"
        >
          Ir para o login
        </a>
      </p>
    </div>
  );
}

export function SemLoja() {
  return (
    <ErrorState
      title="Nenhuma loja encontrada"
      detail="Sua conta ainda não tem uma loja vinculada. Cadastre sua loja em Minha Loja para começar a vender."
    />
  );
}

// Bloco de estado vazio neutro (lista sem itens).
export function VazioBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line p-8 text-center text-sm text-muted dark:border-line">
      {children}
    </div>
  );
}

// Título de página padrão.
export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      )}
    </div>
  );
}
