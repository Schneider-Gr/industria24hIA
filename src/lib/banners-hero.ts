import type { BannerSlide } from "@/components/vitrine/BannerCarousel";

// Só caminho local, âncora ou https: barra javascript:/data: vindos do jsonb.
const urlSegura = (v: unknown): v is string =>
  typeof v === "string" && /^(\/|#|https:\/\/)/.test(v.trim());

/** Normaliza marketplace_config.banners_hero (jsonb) em slides válidos. */
export function parseBannersHero(raw: unknown): BannerSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const b = (item ?? {}) as Record<string, unknown>;
    if (typeof item !== "object" || !urlSegura(b.src) || b.src.startsWith("#")) return [];
    return [
      {
        src: b.src.trim(),
        srcMobile: urlSegura(b.srcMobile) && !b.srcMobile.startsWith("#") ? b.srcMobile.trim() : undefined,
        alt: typeof b.alt === "string" && b.alt.trim() ? b.alt.trim().slice(0, 200) : "Indústria 24h",
        href: urlSegura(b.href) ? b.href.trim() : undefined,
      },
    ];
  });
}
