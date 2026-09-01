-- 0154: estende o teto de tamanho/MIME (feito em 0143 para produtos/lojas/
-- marketplace) aos buckets `entregas` (foto de conclusão de corrida) e
-- `disputas` (evidência de abertura + canal de mediação 0116). Antes disto os
-- dois aceitavam qualquer arquivo — a checagem de magic bytes no server
-- (validacao-imagem.ts) fecha o caso comum, isto é a camada não-contornável.

update storage.buckets
set file_size_limit = 5 * 1024 * 1024, -- 5MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'entregas';

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'] -- gif aceito no canal de mediação
where id = 'disputas';
