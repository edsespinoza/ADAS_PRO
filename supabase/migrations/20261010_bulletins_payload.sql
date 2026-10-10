-- ================================================
-- ADAS PRO — Boletins técnicos: coluna `payload`
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-10-10
--
-- A migração dos boletins de localStorage → Supabase precisa
-- preservar TODOS os campos do objeto (a tabela `public.bulletins`
-- só tem um subconjunto: as ~35 chaves do modelo editorial como
-- appliedVehicles, dtcs, steps, labor, referenceDocs, etc. não têm
-- coluna própria).
--
-- `payload` guarda o objeto de boletim completo (fonte de verdade do
-- renderer de membros.html). As colunas "reais" da tabela continuam
-- sendo preenchidas pelo cliente para permitir RLS/consultas
-- server-side (status, access_level, published_at).
--
-- Aditiva e idempotente — não altera dados existentes.
-- ================================================

ALTER TABLE public.bulletins
  ADD COLUMN IF NOT EXISTS payload jsonb;

COMMENT ON COLUMN public.bulletins.payload IS
  'Objeto de boletim completo (modelo editorial do painel). Fonte de verdade do renderer; as colunas reais são derivadas para RLS/consulta.';

-- updated_at automático (a tabela usava apenas o DEFAULT now() do INSERT,
-- que não é aplicado no ON CONFLICT UPDATE do upsert do cliente).
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

-- Verificação
SELECT 'bulletins.payload criado com sucesso' AS status;
