-- ================================================
-- ADAS PRO — Hardening da policy `audit_insert`
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-10-16
--
-- Antes: `audit_insert` exigia apenas `public.is_admin()` (que inclui gestor),
-- sem amarrar `actor_id` ao autor. Consequências:
--   1. Admin/gestor podia inserir registros de auditoria com `actor_id` de
--      terceiros → forja de log (atribuir ação a outra pessoa).
--   2. Os rate limits de `approve-user` (30/60s) e `notify` (20/min, 100/dia)
--      contam linhas de `audit_logs` por `actor_id` → dava para envenenar o
--      contador de um alvo e negar acesso administrativo a ele (DoS dirigido).
--
-- Depois: `actor_id = auth.uid()` — cada usuário só registra as próprias ações.
-- `service_role` (Edge Functions) ignora RLS e continua logando como antes.
--
-- Idempotente — não altera dados existentes.
-- ================================================

DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;

CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin() AND actor_id = auth.uid());
