import { ErrorState } from "@/components/ErrorState";

// Estados honestos reutilizados pelas telas do seller. Regra do projeto:
// nunca mockar; sem login/sem loja exibimos um estado real, não dados falsos.

export function PrecisaLogin() {
  return (
    <ErrorState
      title="Faça login"
      detail="Nenhuma sessão ativa. Entre com sua conta de vendedor para acessar o painel."
    />
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
    <div className="rounded-md border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
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
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      )}
    </div>
  );
}
