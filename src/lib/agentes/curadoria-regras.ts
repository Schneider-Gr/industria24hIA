// Checagem determinística de completude de produto/loja para a curadoria
// assistida por IA. Presença/tamanho de campo é decidido aqui, em código puro
// — o agente LangSmith só redige o texto humano em cima destes gaps, nunca
// decide o que checar (ver src/lib/agentes/langsmith-curadoria.ts).

export type Gap = { campo: string; mensagem: string };

const NOME_MIN = 10;
const DESCRICAO_MIN = 40;

export function avaliarProduto(
  produto: { nome: string; descricao: string | null; categoria_id: string | null },
  totalImagens: number,
): Gap[] {
  const gaps: Gap[] = [];

  if (produto.nome.trim().length < NOME_MIN) {
    gaps.push({ campo: "nome", mensagem: `Título com menos de ${NOME_MIN} caracteres — descreva melhor o produto.` });
  }
  if (totalImagens === 0) {
    gaps.push({ campo: "imagens", mensagem: "Nenhuma imagem cadastrada — anúncios sem foto vendem muito menos." });
  }
  if (!produto.descricao || produto.descricao.trim().length < DESCRICAO_MIN) {
    gaps.push({ campo: "descricao", mensagem: `Descrição ausente ou com menos de ${DESCRICAO_MIN} caracteres.` });
  }
  if (!produto.categoria_id) {
    gaps.push({ campo: "categoria", mensagem: "Nenhuma categoria selecionada — o produto fica fora das buscas por categoria." });
  }

  return gaps;
}

export function avaliarLoja(loja: {
  cnpj: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  rua: string | null;
  numero: string | null;
  whatsapp: string | null;
  email: string | null;
  chave_pix_confirmada_em: string | null;
}): Gap[] {
  const gaps: Gap[] = [];

  if (!loja.cnpj) {
    gaps.push({ campo: "cnpj", mensagem: "CNPJ não cadastrado." });
  }
  if (!loja.cep || !loja.cidade || !loja.estado || !loja.rua || !loja.numero) {
    gaps.push({ campo: "endereco", mensagem: "Endereço incompleto (CEP, cidade, estado, rua e número)." });
  }
  if (!loja.whatsapp && !loja.email) {
    gaps.push({ campo: "contato", mensagem: "Nenhum canal de contato (WhatsApp ou e-mail) cadastrado." });
  }
  if (!loja.chave_pix_confirmada_em) {
    gaps.push({ campo: "chave_pix", mensagem: "Chave PIX não confirmada — sem ela a loja não recebe repasse." });
  }

  return gaps;
}
