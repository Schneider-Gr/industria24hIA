// Slug decorativo, calculado sempre a partir do nome real - nunca persistido.
// A busca no banco usa so os 36 primeiros chars do param de rota (o UUID),
// entao este slug nunca pode quebrar um link ja publicado (afiliado, QR
// code, sitemap antigo): ele e puro sufixo, ignorado na leitura.
const UUID_LENGTH = 36;

export function slugify(texto: string): string {
  const semAcento = texto
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return !(code >= 0x0300 && code <= 0x036f);
    })
    .join("");
  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function permalink(base: string, id: string, nome: string): string {
  const slug = slugify(nome);
  return slug ? `${base}/${id}-${slug}` : `${base}/${id}`;
}

export function permalinkProduto(id: string, nome: string): string {
  return permalink("/produto", id, nome);
}

export function permalinkLoja(id: string, nome: string): string {
  return permalink("/loja", id, nome);
}

export function permalinkCategoria(id: string, nome: string): string {
  return permalink("/categoria", id, nome);
}

export function permalinkColetiva(id: string, nomeProduto: string): string {
  return permalink("/coletiva", id, nomeProduto);
}

// Extrai o UUID real de um param de rota que pode vir como "{uuid}" ou
// "{uuid}-{slug}" - sempre os 36 primeiros caracteres.
export function extrairIdDoParam(param: string): string {
  return param.slice(0, UUID_LENGTH);
}
