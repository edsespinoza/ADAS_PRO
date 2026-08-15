// ADAS PRO — Edge Function: approve-user
// Executa aprovação/bloqueio de usuários com service_role (server-side)
// Deploy: supabase functions deploy approve-user

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://adaspro.com.br',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Paridade com public.role_level / public.can_manage_role do RLS:
// ninguém age sobre role igual ou superior à sua (service_role ignora RLS,
// então a checagem precisa ser reimplementada aqui).
const ROLE_LEVEL: Record<string, number> = { 'membro': 1, 'gestor': 2, 'admin': 3, 'superadmin': 4 };
const VALID_ROLES  = Object.keys(ROLE_LEVEL);
const VALID_STATUS = ['active', 'pending', 'blocked'];
const VALID_PLANS  = ['free', 'modulo', 'pro', 'premium'];

// Campos editáveis via action=update — whitelist server-side.
// id, email, passwordHash, createdAt etc. nunca são aceitos.
const UPDATE_ALLOWED_FIELDS = ['name', 'role', 'status', 'plan', 'level', 'permissions', 'accessType', 'accessExpires', 'approvedBy'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Validar JWT do chamador
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: 'Token inválido.' }, 401);

    // 2. Verificar se o chamador é admin+ via banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: callerData } = await supabaseAdmin
      .from('users').select('role, status').eq('id', user.id).single();

    const callerRole = callerData?.role || '';
    if (!['admin', 'gestor', 'superadmin'].includes(callerRole)) {
      return json({ error: 'Permissão insuficiente.' }, 403);
    }
    // Conta suspensa/pendente nunca executa ações administrativas
    if (callerData?.status !== 'active') {
      return json({ error: 'Conta inativa ou pendente de aprovação.' }, 403);
    }
    // MFA: se a conta possui fator configurado mas a sessão ainda é aal1,
    // a 2ª etapa é obrigatória (usuários sem MFA têm nextLevel aal1 — passam)
    const { data: aalData } = await supabaseUser.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      return json({ error: 'Autenticação em duas etapas (MFA) é obrigatória para esta ação.' }, 403);
    }

    // 2b. Rate limiting — verificar audit_logs dos últimos 60s
    const { count: recentCount, error: countErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());

    if (!countErr && recentCount && recentCount >= 30) {
      return json({ error: 'Muitas requisições. Aguarde 1 minuto.' }, 429);
    }

    // 3. Executar ação
    const body = await req.json();
    const { action, targetId, updates } = body;

    const VALID_ACTIONS = ['approve', 'block', 'unblock', 'update', 'delete', 'create'];
    if (!action || !VALID_ACTIONS.includes(action)) return json({ error: 'Ação inválida.' }, 400);

    // Gestor só pode aprovar/bloquear/desbloquear — não cria, exclui nem atualiza dados
    const GESTOR_ALLOWED = ['approve', 'block', 'unblock'];
    if (callerRole === 'gestor' && !GESTOR_ALLOWED.includes(action)) {
      return json({ error: 'Gestor só pode aprovar, bloquear ou desbloquear usuários.' }, 403);
    }

    // ── CREATE: path independente (não requer targetId) ──────────────────────
    if (action === 'create') {
      const { email, password, name, role: newRole, status: newStatus, permissions, plan, level } = body;
      if (!email || !password || !name) return json({ error: 'email, password e name são obrigatórios.' }, 400);
      if (password.length < 8) return json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, 400);

      const safeRole = VALID_ROLES.includes(newRole) ? newRole : 'membro';
      const safeStatus = VALID_STATUS.includes(newStatus) ? newStatus : 'active';

      // Paridade com can_manage_role (RLS): role deve ser estritamente inferior à do chamador
      if (ROLE_LEVEL[safeRole] >= ROLE_LEVEL[callerRole]) {
        return json({ error: 'Não é permitido criar conta com role igual ou superior à sua.' }, 403);
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });
      if (authError || !authData.user) return json({ error: authError?.message || 'Erro ao criar usuário.' }, 500);

      const newId = authData.user.id;
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: newId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: safeRole,
        status: safeStatus,
        permissions: permissions || [],
        plan: plan || 'free',
        level: level || 'tecnico',
        accessType: plan && plan !== 'free' ? 'subscription' : 'trial',
        createdAt: Date.now(),
        approvedAt: Date.now(),
        approvedBy: user.id,
      });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(newId);
        return json({ error: insertError.message }, 500);
      }

      const { error: createLogErr } = await supabaseAdmin.from('audit_logs').insert({
        action: 'create_user', actor_id: user.id, target_id: newId,
        details: { name, email, role: safeRole }, created_at: new Date().toISOString()
      });
      if (createLogErr) console.error('[approve-user] logAudit create falhou:', createLogErr.message);

      return json({ ok: true, data: { userId: newId } });
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!targetId) return json({ error: 'targetId obrigatório.' }, 400);

    // Paridade com can_manage_role (RLS): só age sobre roles estritamente inferiores à do chamador
    const { data: targetData } = await supabaseAdmin
      .from('users').select('role').eq('id', targetId).single();
    const targetRole = targetData?.role || '';
    if (!VALID_ROLES.includes(targetRole)) {
      return json({ error: 'Usuário não encontrado.' }, 404);
    }
    if (ROLE_LEVEL[targetRole] >= ROLE_LEVEL[callerRole]) {
      return json({ error: 'Não é permitido agir sobre contas com role igual ou superior à sua.' }, 403);
    }

    let result;
    if (action === 'approve') {
      result = await supabaseAdmin.from('users').update({
        status: 'active',
        approvedAt: Date.now(),
        approvedBy: user.id,
      }).eq('id', targetId);
    } else if (action === 'block') {
      result = await supabaseAdmin.from('users').update({ status: 'blocked' }).eq('id', targetId);
    } else if (action === 'unblock') {
      result = await supabaseAdmin.from('users').update({ status: 'active' }).eq('id', targetId);
    } else if (action === 'delete') {
      // Remove também do Supabase Auth — senão a credencial continua válida
      // e o e-mail fica "preso" (impede recadastro com o mesmo e-mail).
      // "User not found" é tratado como sucesso (idempotente).
      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
      if (authDelErr && !/not found/i.test(authDelErr.message)) {
        return json({ error: `Falha ao excluir credenciais: ${authDelErr.message}` }, 500);
      }
      result = await supabaseAdmin.from('users').delete().eq('id', targetId);
    } else if (action === 'update' && updates) {
      // Whitelist de campos — impede escrita de campos críticos (id, email, passwordHash, createdAt...)
      const safe: Record<string, unknown> = {};
      for (const k of Object.keys(updates)) {
        if (UPDATE_ALLOWED_FIELDS.includes(k)) safe[k] = updates[k];
      }
      if (safe.role !== undefined) {
        const r = safe.role as string;
        if (!VALID_ROLES.includes(r)) return json({ error: 'Role inválida.' }, 400);
        // Paridade com can_manage_role: não promove para role igual ou superior à do chamador
        if (ROLE_LEVEL[r] >= ROLE_LEVEL[callerRole]) {
          return json({ error: 'Não é permitido atribuir role igual ou superior à sua.' }, 403);
        }
      }
      if (safe.status !== undefined && !VALID_STATUS.includes(safe.status as string)) return json({ error: 'Status inválido.' }, 400);
      if (safe.plan !== undefined && !VALID_PLANS.includes(safe.plan as string)) return json({ error: 'Plano inválido.' }, 400);
      if (safe.permissions !== undefined) {
        if (!Array.isArray(safe.permissions) || safe.permissions.some((p: unknown) => typeof p !== 'string')) {
          return json({ error: 'permissions deve ser uma lista de strings.' }, 400);
        }
      }
      result = await supabaseAdmin.from('users').update(safe).eq('id', targetId);
    } else {
      return json({ error: 'Ação inválida.' }, 400);
    }

    if (result?.error) return json({ error: result.error.message }, 500);

    // 4. Log de auditoria
    const { error: logErr } = await supabaseAdmin.from('audit_logs').insert({
      action, actor_id: user.id, target_id: targetId,
      details: updates || null, created_at: new Date().toISOString()
    });
    if (logErr) console.error('[approve-user] logAudit falhou:', action, logErr.message);

    return json({ ok: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
