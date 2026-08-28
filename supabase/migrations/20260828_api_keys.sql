-- ================================================
-- ADAS PRO — Tabela de API Keys (api_keys)
-- Executar no SQL Editor do Supabase (ou supabase db push)
--
-- Credenciais de acesso à API pública roteada pela Edge Function
-- api-gateway. Cada chave começa com o prefixo 'adas_live_' e é
-- armazenada APENAS como hash SHA-256 (nunca o valor em texto puro).
-- O valor em texto puro é exibido uma única vez na criação e pode ser
-- gerado novamente (reset) se necessário.
-- ================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  key_hash   text        NOT NULL,            -- SHA-256 hex da chave (64 chars), prefixo adas_live_
  name       text        NOT NULL,            -- rótulo de identificação (ex.: 'produção', 'staging', 'cliente-xyz')
  user_id    uuid,                            -- dono da chave (opcional) -> public.users.id
  plan       text        NOT NULL DEFAULT 'premium',
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,                            -- superadmin que criou (opcional)
  last_used_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE SET NULL
);

-- Busca rápida por hash na autenticação (Edge Function)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id   ON public.api_keys (user_id);

-- RLS: nenhum papel autenticado lê/grava; somente service_role (Edge Function)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_none" ON public.api_keys;
CREATE POLICY "api_keys_none" ON public.api_keys
  FOR ALL USING (false) WITH CHECK (false);

-- Comentários
COMMENT ON TABLE  public.api_keys IS 'Chaves de API (adas_live_*) para acesso à API pública do api-gateway; armazenadas como hash SHA-256';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hex da chave em texto puro';
COMMENT ON COLUMN public.api_keys.plan IS 'Plano de acesso (premium, etc.) associado à chave';
COMMENT ON COLUMN public.api_keys.active IS 'Se a chave está ativa (false revoga o acesso)';

-- Helper: criar chave. Recebe o TEXTO PURO da chave (ex.: adas_live_xxx),
-- armazena apenas o hash e retorna a linha criada.
-- Uso: SELECT * FROM public.adas_create_api_key('adas_live_minhachave', 'produção', '70b71d1e-...');
CREATE OR REPLACE FUNCTION public.adas_create_api_key(
  p_key    text,
  p_name   text,
  p_user_id uuid DEFAULT NULL,
  p_plan   text DEFAULT 'premium'
)
RETURNS public.api_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row public.api_keys;
BEGIN
  IF p_key IS NULL OR length(p_key) < 12 THEN
    RAISE EXCEPTION 'Chave inválida (mínimo 12 caracteres)';
  END IF;

  INSERT INTO public.api_keys (key_hash, name, user_id, plan, active)
  VALUES (encode(sha256(p_key::bytea), 'hex'), p_name, p_user_id, p_plan, true)
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

-- Helper: revogar (desativar) chave pelo valor em texto puro
CREATE OR REPLACE FUNCTION public.adas_deactivate_api_key(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET active = false
  WHERE key_hash = encode(sha256(p_key::bytea), 'hex');
END;
$$;

-- Verificação
SELECT 'api_keys configurado com sucesso' AS status;
