-- ================================================
-- ADAS PRO — Row Level Security (RLS)
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-04-25
-- Execute inteiro no SQL Editor do Supabase
-- ================================================


-- ────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES (SECURITY DEFINER)
--    Executam como owner (postgres), ignoram RLS
--    → evitam recursão infinita nas políticas
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_my_role() IN ('admin', 'gestor', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_my_role() = 'superadmin';
$$;


-- ────────────────────────────────────────────────
-- 2. TABELA: public.users
-- ────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (idempotente)
DROP POLICY IF EXISTS "users_select"          ON public.users;
DROP POLICY IF EXISTS "users_insert"          ON public.users;
DROP POLICY IF EXISTS "users_update"          ON public.users;
DROP POLICY IF EXISTS "users_delete"          ON public.users;

-- SELECT: próprio usuário OU admin+
CREATE POLICY "users_select" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- INSERT: novo usuário insere o próprio perfil (registro)
--         role deve ser 'membro' e status 'pending' — impede registro como admin
--         OU admin+ faz upsert de qualquer usuário
CREATE POLICY "users_insert" ON public.users
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role   = 'membro'
      AND status = 'pending'
    )
  );

-- UPDATE: admin+ atualiza qualquer usuário sem restrição de campos
--         Membro só atualiza o próprio registro E não pode mudar role/status
--         (WITH CHECK lê os valores atuais — impede escalada de privilégio)
CREATE POLICY "users_update" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role   = (SELECT role   FROM public.users WHERE id = auth.uid())
      AND status = (SELECT status FROM public.users WHERE id = auth.uid())
    )
  );

-- DELETE: apenas superadmin pode excluir usuários
CREATE POLICY "users_delete" ON public.users
  FOR DELETE
  USING (
    public.is_superadmin()
  );


-- ────────────────────────────────────────────────
-- 3. TABELA: public.tickets
-- ────────────────────────────────────────────────

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;

-- SELECT: dono do ticket OU admin+
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- INSERT: usuário autenticado cria ticket para si mesmo
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"
  );

-- UPDATE: admin+ pode atualizar (responder, mudar status)
--         membro pode atualizar apenas seus próprios tickets
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- DELETE: apenas admin+
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE
  USING (
    public.is_admin()
  );


-- ────────────────────────────────────────────────
-- 4. TABELA: public.notifications
-- ────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

-- SELECT: notificações do próprio usuário OU admin+
CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- INSERT: usuário autenticado insere notificação sobre si
--         OU admin+ insere qualquer notificação
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- UPDATE: próprio usuário marca como lido OU admin+
CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- DELETE: admin+ pode limpar notificações
CREATE POLICY "notif_delete" ON public.notifications
  FOR DELETE
  USING (
    public.is_admin()
  );


-- ────────────────────────────────────────────────
-- 5. VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────

-- Confirma que RLS está ativo nas 3 tabelas
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'tickets', 'notifications')
ORDER BY tablename;

-- Lista todas as políticas criadas
SELECT
  tablename,
  policyname,
  cmd        AS operation,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'tickets', 'notifications')
ORDER BY tablename, policyname;
