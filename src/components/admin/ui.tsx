// Primitivos visuais do módulo admin — movidos para src/components/painel/ui.tsx
// (fonte única compartilhada com o seller). Re-exportado aqui para não quebrar
// os imports existentes (`@/components/admin/ui`) em ~27 arquivos.
export {
  fmtBRL,
  fmtDate,
  PageHeader,
  KpiCard,
  EmptyState,
  StatusBadge,
  Table,
} from "@/components/painel/ui";
