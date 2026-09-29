-- ADAS PRO — Migration 20260830: revogação de API keys ao bloquear usuário
--
-- Vulnerabilidade: approve-user action:'block' escrevia apenas
-- users.status='blocked'. As API keys em public.api_keys permaneciam com
-- active=true, e validateApiKey() no api-gateway só checava api_keys.active
-- (nunca o status do dono). Resultado: um usuário bloqueado continuava
-- autenticando no gateway com sua chave — o desprovisionamento era burlável.
--
-- Correção em duas camadas:
--   1. Trigger: qualquer transição para 'blocked' desativa as chaves do usuário.
--   2. Índice parcial: suporte à consulta do trigger (WHERE active = true).
--
-- Idempotente — reexecutar não causa erro.

-- ────────────────────────────────────────────────
-- 1. Índice parcial para as chaves ativas do usuário
-- ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
  ON public.api_keys (user_id) WHERE active = true;

-- ────────────────────────────────────────────────
-- 2. Trigger: block/pending desativa as API keys do usuário
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_api_keys_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Só revoga na transição para um estado não-ativo. Evita reescrever as
  -- linhas em updates que não mudaram o status (ex.: update de 'name').
  IF NEW.status IN ('blocked', 'pending')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    UPDATE public.api_keys
       SET active = false
     WHERE user_id = NEW.id
       AND active = true;

    IF FOUND THEN
      RAISE NOTICE '[revoke_api_keys_on_block] % chave(s) desativada(s) para o usuário %',
        'várias', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_api_keys_on_block ON public.users;

CREATE TRIGGER trg_revoke_api_keys_on_block
  BEFORE UPDATE OF status ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_api_keys_on_block();

-- O SECURITY DEFINER acima roda como owner; o search_path vazio impede
-- hijack por schema malicioso. O INSERT é explícito no schema public.
REVOKE EXECUTE ON FUNCTION public.revoke_api_keys_on_block() FROM anon, authenticated, public;

-- Verificação
SELECT 'patch de revogação de API keys 20260830 aplicado com sucesso' AS status;
