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

// Produto usa o slug persistido em produtos.slug (0207), não o UUID: o slug é
// fixo desde a criação, então renomear o produto não quebra link publicado.
// URL antiga /produto/<uuid>[-nome] redireciona para cá (ver produto/[id]).
export function permalinkProduto(slug: string): string {
  return `/produto/${slug}`;
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

const UUID_NO_INICIO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-|$)/i;

// Param de /produto no formato antigo ({uuid} ou {uuid}-{nome})?
export function ehParamComUuid(param: string): boolean {
  return UUID_NO_INICIO.test(param);
}
