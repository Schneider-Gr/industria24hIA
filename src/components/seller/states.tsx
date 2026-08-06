import { ErrorState } from "@/components/ErrorState";
import { EmptyState, PageHeader } from "@/components/painel/ui";

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

// Bloco de estado vazio neutro (lista sem itens) — mesmo componente do admin
// (`EmptyState`), mantido com o nome antigo para não tocar ~15 call sites.
export const VazioBox = EmptyState;

// Título de página padrão — mesmo componente do admin (`PageHeader`), mantido
// com o nome antigo para não tocar ~20 call sites.
export const PageTitle = PageHeader;
