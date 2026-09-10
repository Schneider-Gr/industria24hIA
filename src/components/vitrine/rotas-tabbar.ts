// Áreas que já têm chrome própria (Sidebar/Shell) e por isso não recebem a
// TabBarMobile. Exportado à parte porque o ChatWidget precisa da mesma
// regra: onde não há tab bar, o botão flutuante de atendimento continua
// sendo a única porta de entrada no mobile.
export const ROTAS_SEM_TABBAR = ["/admin", "/seller", "/afiliado", "/parceiro"];

export function temTabBar(pathname: string) {
  return !ROTAS_SEM_TABBAR.some((rota) => pathname.startsWith(rota));
}
