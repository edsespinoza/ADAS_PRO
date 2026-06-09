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
      .from('users').select('role').eq('id', user.id).single();

    const callerRole = callerData?.role || '';
    if (!['admin', 'gestor', 'superadmin'].includes(callerRole)) {
      return json({ error: 'Permissão insuficiente.' }, 403);
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

      const VALID_ROLES = ['superadmin', 'admin', 'gestor', 'membro'];
      const safeRole = VALID_ROLES.includes(newRole) ? newRole : 'membro';

      if (['admin', 'superadmin'].includes(safeRole) && callerRole !== 'superadmin') {
        return json({ error: 'Apenas superadmin pode criar contas admin.' }, 403);
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
        status: newStatus || 'active',
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

    // Impede que admin exclua ou rebaixe outro admin/superadmin
    const { data: targetData } = await supabaseAdmin
      .from('users').select('role').eq('id', targetId).single();
    const targetRole = targetData?.role || '';
    if (['admin','superadmin'].includes(targetRole) && callerRole !== 'superadmin') {
      return json({ error: 'Apenas superadmin pode agir sobre contas admin.' }, 403);
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
      // Proteção extra: nunca deletar superadmin
      if (targetRole === 'superadmin') {
        return json({ error: 'Conta superadmin não pode ser excluída.' }, 403);
      }
      result = await supabaseAdmin.from('users').delete().eq('id', targetId);
    } else if (action === 'update' && updates) {
      // Protege campos críticos
      const safe = { ...updates };
      delete safe.id; delete safe.email; delete safe.passwordHash;
      // Apenas superadmin pode promover para admin
      if (safe.role && ['admin','superadmin'].includes(safe.role) && callerRole !== 'superadmin') {
        return json({ error: 'Apenas superadmin pode promover para admin.' }, 403);
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
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
