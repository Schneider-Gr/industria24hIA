import { z } from "zod";

// Valida a forma dos campos que finalizarCompra() recebe de formData antes
// de tocar em Supabase/RPC. Preço/estoque continuam recalculados no banco
// (checkout_criar_pedido) — isto é validação de forma/tipo, não de negócio.

export const itemCarrinhoSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().positive(),
  venda_futura_id: z.string().uuid().nullable().optional(),
  loja_id: z.string().uuid(),
});

export const itensCarrinhoSchema = z.array(itemCarrinhoSchema).min(1, "Carrinho vazio.");

export const freteLojaSchema = z.object({
  transportadora_id: z.string().uuid().nullable(),
  cotacao_uber_direct_id: z.string().uuid().nullable(),
});

export const fretePorLojaSchema = z.record(z.string().uuid(), freteLojaSchema);

export const billingTypeSchema = z.enum(["PIX", "BOLETO", "CREDIT_CARD"]);

// Máx. 12x — limite de produto, não do Asaas (que aceita mais). Só se aplica
// a CREDIT_CARD; PIX/BOLETO ignoram este campo.
export const parcelasSchema = z.coerce.number().int().min(1).max(12).catch(1);

export const cpfCnpjSchema = z
  .string()
  .regex(/^\d{11}$|^\d{14}$/, "Informe um CPF ou CNPJ válido.");
