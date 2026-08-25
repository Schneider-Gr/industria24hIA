-- 0143: teto de tamanho/MIME nos buckets de imagem (produtos, lojas,
-- marketplace, criados em 0051/0056). ImageUpload.tsx já valida no client,
-- mas isso é só dica de UI — a camada que não dá pra contornar é aqui.
-- Achado #5 da auditoria OWASP de 24/08/2026.

update storage.buckets
set file_size_limit = 5 * 1024 * 1024, -- 5MB, mesmo teto de disputa-mediacao-upload.ts
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('produtos', 'lojas', 'marketplace');
