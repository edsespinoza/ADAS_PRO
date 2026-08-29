-- ================================================
-- ADAS PRO — Patch de segurança 20260829
-- Auditoria: criação de chave premium via RPC anônimo (CRÍTICO)
-- Aplicar: supabase db query --linked -f supabase/migrations/20260829_security_fixes.sql
-- Idempotente: pode ser re-executado sem efeitos colaterais.
-- ================================================

-- ────────────────────────────────────────────────
-- 1. CRÍTICO — adas_create_api_key / adas_deactivate_api_key
--    Funções SECURITY DEFINER criavam/desativavam chaves sem checar role.
--    → checagem de autorização no corpo + EXECUTE só p/ service_role
--    → search_path fixo ('' ) impede hijack por schema malicioso
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.adas_create_api_key(
  p_key    text,
  p_name   text,
  p_user_id uuid DEFAULT NULL,
  p_plan   text DEFAULT 'premium'
)
RETURNS public.api_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_row public.api_keys;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Acesso negado: requer superadmin ou admin';
  END IF;

  IF p_key IS NULL OR length(p_key) < 12 THEN
    RAISE EXCEPTION 'Chave inválida (mínimo 12 caracteres)';
  END IF;

  INSERT INTO public.api_keys (key_hash, name, user_id, plan, active)
  VALUES (encode(sha256(p_key::bytea), 'hex'), p_name, p_user_id, p_plan, true)
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.adas_deactivate_api_key(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Acesso negado: requer superadmin ou admin';
  END IF;

  UPDATE public.api_keys
  SET active = false
  WHERE key_hash = encode(sha256(p_key::bytea), 'hex');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adas_create_api_key(text, text, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.adas_deactivate_api_key(text) FROM anon, authenticated, public;
GRANT  EXECUTE ON FUNCTION public.adas_create_api_key(text, text, uuid, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.adas_deactivate_api_key(text) TO service_role;

-- ────────────────────────────────────────────────
-- 2. increment_rate_limit — RPC usado pelo api-gateway
--    → EXECUTE apenas service_role + search_path fixo
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_bucket text,
  p_window timestamptz,
  p_limit integer,
  p_window_ms integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, window_start, count)
  VALUES (p_bucket, p_window, 1)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO new_count;

  DELETE FROM public.rate_limits
  WHERE window_start < now() - make_interval(secs => (p_window_ms * 2) / 1000.0);

  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(text, timestamptz, integer, integer) FROM anon, authenticated, public;
GRANT  EXECUTE ON FUNCTION public.increment_rate_limit(text, timestamptz, integer, integer) TO service_role;

-- ────────────────────────────────────────────────
-- 3. quiz_questions — não vazar o gabarito
--    correct_answer ficava visível a qualquer autenticado.
-- ────────────────────────────────────────────────
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT SELECT (id, certification_id, module_id, question, options, points, sort_order)
  ON public.quiz_questions TO authenticated;

-- ────────────────────────────────────────────────
-- 4. articles / bulletins — bloquear anon (paywall vazada)
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "articles_select_published" ON public.articles;
CREATE POLICY "articles_select_published" ON public.articles
  FOR SELECT TO authenticated USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "articles_write_admin" ON public.articles;
CREATE POLICY "articles_write_admin" ON public.articles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bulletins_select_published" ON public.bulletins;
CREATE POLICY "bulletins_select_published" ON public.bulletins
  FOR SELECT TO authenticated USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "bulletins_write_admin" ON public.bulletins;
CREATE POLICY "bulletins_write_admin" ON public.bulletins
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ────────────────────────────────────────────────
-- 5. settings_update — WITH CHECK (consistência RLS)
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings_update" ON public.settings;
CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

-- Verificação
SELECT 'patch de segurança 20260829 aplicado com sucesso' AS status;