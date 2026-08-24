import { z } from "zod";

// Valida a forma dos campos que criarColetiva()/participarColetiva() recebem
// de formData. Faixa de preço/estoque continuam recalculados no banco
// (coletiva_criar/coletiva_participar) — isto é validação de forma, não de
// regra de negócio.

export const entregaColetivaSchema = z
  .object({
    cep: z.string().min(1),
    rua: z.string(),
    numero: z.string(),
    bairro: z.string(),
    cidade: z.string(),
    complemento: z.string(),
  })
  .nullable();

export const criarColetivaSchema = z.object({
  produto_id: z.string().uuid("produto_id inválido."),
  quantidade: z.number().int().positive("Quantidade deve ser maior que zero."),
  entrega: entregaColetivaSchema,
});

export const participarColetivaSchema = z.object({
  coletiva_id: z.string().uuid("coletiva_id inválido."),
  quantidade: z.number().int().positive("Quantidade deve ser maior que zero."),
});
