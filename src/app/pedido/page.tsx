import { redirect } from "next/navigation";

// Rota /pedido sem ID redireciona para /meus-pedidos
export default function PedidoRedirectPage() {
  redirect("/meus-pedidos");
}
