import { describe, expect, it } from "vitest";
import { parseBannersHero } from "./banners-hero";

describe("parseBannersHero", () => {
  it("mantém slides válidos e descarta URLs perigosas", () => {
    expect(
      parseBannersHero([
        { src: "https://x.supabase.co/a.png", alt: "A", href: "#mercado-futuro" },
        { src: "javascript:alert(1)", alt: "B" },
        { src: "/b.png", srcMobile: "data:image/png;base64,x", href: "javascript:x" },
        null,
      ]),
    ).toEqual([
      { src: "https://x.supabase.co/a.png", srcMobile: undefined, alt: "A", href: "#mercado-futuro" },
      { src: "/b.png", srcMobile: undefined, alt: "Indústria 24h", href: undefined },
    ]);
    expect(parseBannersHero("lixo")).toEqual([]);
  });
});
