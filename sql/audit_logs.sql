-- ================================================
-- ADAS PRO — Tabela de Auditoria (audit_logs)
-- Execute no SQL Editor do Supabase
-- ================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  action     text         NOT NULL,
  actor_id   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id  text,
  details    jsonb,
  ip         text,
  created_at timestamptz  DEFAULT now()
);

-- Índices para consultas rápidas no painel
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON public.audit_logs (target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON public.audit_logs (action);

-- RLS: somente admins lêem; inserção feita por service_role ou admin
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;

CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- Comentários descritivos
COMMENT ON TABLE  public.audit_logs            IS 'Registro de ações administrativas do sistema ADAS PRO';
COMMENT ON COLUMN public.audit_logs.action     IS 'approve_user | block_user | delete_user | update_role | update_permissions | reply_ticket | delete_ticket';
COMMENT ON COLUMN public.audit_logs.actor_id   IS 'UUID do admin que executou a ação';
COMMENT ON COLUMN public.audit_logs.target_id  IS 'UUID do usuário ou ID do ticket afetado';
COMMENT ON COLUMN public.audit_logs.details    IS 'Dados adicionais da ação (JSON)';

-- Verificação
SELECT 'audit_logs criado com sucesso' AS status;
