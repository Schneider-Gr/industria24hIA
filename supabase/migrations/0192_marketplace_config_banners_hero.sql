-- Galeria do carousel da home: lista ordenada de slides editável em
-- /admin/editar-marketplace. Formato de cada item = BannerSlide
-- ({ src, srcMobile?, alt, href? }). Semeia com os 3 slides que estavam
-- fixos no código para a home não mudar no deploy.

alter table public.marketplace_config
  add column if not exists banners_hero jsonb not null default '[]'::jsonb;

update public.marketplace_config
set banners_hero = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'src', coalesce(banner_desktop_url, '/banners/banner-principal.png'),
    'srcMobile', coalesce(banner_mobile_url, '/banners/banner-3-mobile.jpg'),
    'alt', 'Indústria 24h — compre direto de quem fabrica')),
  jsonb_build_object('src', '/banners/banner-mercado-futuro.png', 'alt', 'Compre do Mercado Futuro', 'href', '#mercado-futuro'),
  jsonb_build_object('src', '/banners/banner-3.jpg', 'srcMobile', '/banners/banner-3-mobile.jpg', 'alt', 'Indústria 24h')
)
where id = 1 and banners_hero = '[]'::jsonb;
