// Textos da landing de parceiro logístico que o /login repete para quem chega
// sem cadastro. Só entra o que o cadastro e o painel já fazem em produção.
export const BENEFICIOS = [
  { t: "Você escolhe a corrida", d: "O feed mostra endereço, distância e valor do frete antes do aceite. Aceita só o que compensa." },
  { t: "Frete via PIX", d: "O valor cai na chave PIX que você cadastrou, sem boleto e sem intermediário." },
  { t: "Seu valor mínimo", d: "Você define o valor mínimo por entrega e a sua área de atuação. Assim o marketplace sabe onde e por quanto você roda." },
  { t: "Cargas de várias indústrias", d: "Pedidos pagos de todas as lojas do marketplace, inclusive as que não têm entregador próprio." },
] as const;

export const ETAPAS = [
  { n: "01", t: "Faça o cadastro", d: "Leva poucos minutos: dados, veículo, CEP base, área de atuação e PIX." },
  { n: "02", t: "Aprovação da equipe", d: "Nossa equipe confere os documentos e libera o seu acesso ao feed." },
  { n: "03", t: "Aceite corridas", d: "Pedidos pagos aparecem com endereço, distância e valor. Você decide." },
  { n: "04", t: "Entregue e receba", d: "Você registra a posição por GPS durante o transporte e o frete sai via PIX." },
] as const;
