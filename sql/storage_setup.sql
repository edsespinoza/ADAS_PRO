-- ================================================
-- ADAS PRO — Supabase Storage: bucket "materiais"
-- Execute no SQL Editor do Supabase
-- ================================================

-- 1. Criar bucket privado para PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materiais',
  'materiais',
  false,
  52428800,  -- 50 MB por arquivo
  ARRAY['application/pdf','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS no storage: admin faz upload/delete
DROP POLICY IF EXISTS "admin_upload"    ON storage.objects;
DROP POLICY IF EXISTS "admin_delete"    ON storage.objects;
DROP POLICY IF EXISTS "member_download" ON storage.objects;

CREATE POLICY "admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materiais'
    AND public.is_admin()
  );

CREATE POLICY "admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materiais'
    AND public.is_admin()
  );

-- 3. Listagem e acesso direto via API: apenas admins
--    Downloads de membros usam signed URLs geradas pela Edge Function get-download-url,
--    que verifica permissões no servidor — não dependem desta política SELECT.
CREATE POLICY "member_download" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiais'
    AND public.is_admin()
  );

-- Verificação
SELECT id, name, public FROM storage.buckets WHERE id = 'materiais';
