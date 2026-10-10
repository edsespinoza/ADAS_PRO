-- ================================================
-- ADAS PRO — Boletins técnicos: coluna `payload` (standalone idempotente)
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-10-10
--
-- Espelho de supabase/migrations/20261010_bulletins_payload.sql.
-- Rodar com: supabase db query --linked -f sql/bulletins_payload.sql
--
-- Adiciona `payload jsonb` (objeto de boletim completo) + trigger de
-- updated_at. Não altera dados existentes; seguro reexecutar.
-- ================================================

ALTER TABLE public.bulletins
  ADD COLUMN IF NOT EXISTS payload jsonb;

COMMENT ON COLUMN public.bulletins.payload IS
  'Objeto de boletim completo (modelo editorial do painel). Fonte de verdade do renderer; as colunas reais são derivadas para RLS/consulta.';

CREATE OR REPLACE FUNCTION public.set_bulletins_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bulletins_updated_at ON public.bulletins;
CREATE TRIGGER trg_bulletins_updated_at
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW EXECUTE FUNCTION public.set_bulletins_updated_at();

SELECT 'bulletins.payload criado com sucesso' AS status;
