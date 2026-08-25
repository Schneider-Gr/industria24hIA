import { z } from "zod";

// Valida a forma dos campos que publicarLeilao/darLanceLeilao/adjudicarLeilao
// recebem de formData, antes de tocar nas RPCs (publicar_leilao_fabricante,
// dar_lance_leilao, adjudicar_leilao), que continuam sendo a fonte de verdade
// de regra de negócio.

export const publicarLeilaoSchema = z.object({
  titulo: z.string().trim().min(1, "Informe um título."),
  descricao: z.string().trim().min(1, "Informe uma descrição."),
  volume: z.string().trim().min(1, "Informe o volume."),
  categoria_id: z.string().uuid().nullable(),
  prazo_desejado: z.string().trim().nullable(),
  janela_fim: z.string().min(1, "Informe a data limite do leilão."),
});

export const darLanceLeilaoSchema = z.object({
  leilao_id: z.string().uuid("leilao_id inválido."),
  preco: z.number().positive("Informe um preço válido."),
  prazo: z.string().trim().min(1, "Informe o prazo."),
  condicoes: z.string().trim().nullable(),
});

export const adjudicarLeilaoSchema = z.object({
  leilao_id: z.string().uuid("leilao_id inválido."),
  lance_id: z.string().uuid("lance_id inválido."),
});
