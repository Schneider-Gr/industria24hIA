import type { createClient } from "@/lib/supabase/server";
import { validarConteudoImagem } from "@/lib/validacao-imagem";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB — mesma ordem de grandeza de disputa_fotos (evidência da abertura)
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Upload de foto no canal de mediação (0116) — path
// mediacao/{disputaId}/{destinatario}/{arquivo}, mesmo bucket privado
// `disputas` das fotos de abertura de disputa (0104). RLS de storage
// (disputas_bucket_mediacao_upload) garante que só quem participa daquele
// canal específico consegue gravar ali. `accept="image/*"` no input é só
// dica de client — valida tamanho/tipo aqui no server antes do upload.
export async function uploadFotoMediacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  disputaId: string,
  destinatario: "comprador" | "loja",
  foto: File,
): Promise<string | null> {
  if (foto.size > TAMANHO_MAXIMO_BYTES) throw new Error("Foto maior que 5MB — reduza o tamanho e tente de novo.");
  if (!TIPOS_ACEITOS.includes(foto.type)) throw new Error("Formato de imagem não suportado — use JPG, PNG, WEBP ou GIF.");
  const erroConteudo = await validarConteudoImagem(foto);
  if (erroConteudo) throw new Error(erroConteudo);

  const ext = (foto.name.split(".").pop() || "jpg").replace(/[^\w]/g, "");
  const caminho = `mediacao/${disputaId}/${destinatario}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("disputas").upload(caminho, foto);
  if (error) return null;
  return caminho;
}
