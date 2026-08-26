-- ================================================
-- ADAS PRO — Tabela de configurações globais (settings)
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Execute no SQL Editor do Supabase (ou via supabase db query --linked)
-- ================================================

-- Tabela key/value — uma linha por configuração global
CREATE TABLE IF NOT EXISTS public.settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

-- SELECT: qualquer usuário autenticado (membros precisam ler moduleAccess
-- para que a UI reflita módulos desativados / nível mínimo)
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT
  USING ((select auth.jwt()->> 'role') = 'authenticated');

-- INSERT/UPDATE/DELETE: apenas admin+ (gestor não gerencia configurações)
CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE
  USING (public.is_admin_staff());

CREATE POLICY "settings_delete" ON public.settings
  FOR DELETE
  USING (public.is_admin_staff());

-- Confirmar RLS ativo
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'settings';
