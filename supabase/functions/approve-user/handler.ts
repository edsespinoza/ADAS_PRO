// ADAS PRO — Edge Function: approve-user — lógica
// Executa aprovação/bloqueio de usuários com service_role (server-side)
// A entrada (serve/createClient/Deno.env) fica em index.ts; esta lógica é
// testável sem importar módulos remotos nem o runtime Deno.

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

export interface ApproveUserDeps {
  createUserClient(authHeader: string): {
    auth: {
      getUser(): Promise<{
        data: { user: { id: string } | null } | null;
        error: { message: string } | null;
      }>;
      mfa: {
        getAuthenticatorAssuranceLevel(): Promise<{
          data: { nextLevel: string | null; currentLevel: string | null } | null;
        }>;
      };
    };
  };
  createAdminClient(): {
    auth: {
      admin: {
        createUser(options: Record<string, unknown>): Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;
        deleteUser(id: string): Promise<{ error: { message: string } | null }>;
      };
    };
    from(table: string): any;
  };
}

export async function handler(req: Request, deps: ApproveUserDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // SECURITY: Reject non-POST methods
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  // SECURITY: Reject oversized payloads
  const contentLength = parseInt(req.headers.get('content-length') || '0');
  if (contentLength > 65536) return json({ error: 'Payload muito grande.' }, 413);

  try {
    // 1. Validar JWT do chamador
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

    const supabaseUser = deps.createUserClient(authHeader);

    const { data: authData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !authData?.user) return json({ error: 'Token inválido.' }, 401);
    const user = authData.user;

    // 2. Verificar se o chamador é admin+ via banco
    const supabaseAdmin = deps.createAdminClient();

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

      // SECURITY: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) return json({ error: 'Formato de e-mail inválido.' }, 400);

      // SECURITY: Validate name (not empty after trim, max 120 chars)
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length > 120) return json({ error: 'Nome inválido (máx. 120 caracteres).' }, 400);

      // SECURITY: Validate password strength
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))
        return json({ error: 'A senha deve conter ao menos uma maiúscula, uma minúscula e um número.' }, 400);

      // SECURITY: Validate create action fields (same as update)
      const VALID_PLANS_C = ['free', 'modulo', 'pro', 'premium'];
      const VALID_LEVELS = ['tecnico', 'intermediario', 'avancado'];
      
      if (plan !== undefined && plan !== null && plan !== '' && !VALID_PLANS_C.includes(plan as string))
        return json({ error: 'Plano inválido.' }, 400);
      if (level !== undefined && level !== null && level !== '' && !VALID_LEVELS.includes(level as string))
        return json({ error: 'Level inválido.' }, 400);
      if (permissions !== undefined && permissions !== null) {
        if (!Array.isArray(permissions) || permissions.some((p: unknown) => typeof p !== 'string'))
          return json({ error: 'permissions deve ser uma lista de strings.' }, 400);
      }
      if (newRole !== undefined && newRole !== null && newRole !== '' && !['membro', 'gestor', 'admin', 'superadmin'].includes(newRole as string))
        return json({ error: 'Role inválido.' }, 400);

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
      if (authError || !authData?.user) return json({ error: authError?.message || 'Erro ao criar usuário.' }, 500);
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
      // SECURITY: revoga as API keys do usuário. Sem isto, a chave continua
      // com active=true e o api-gateway (que só checava api_keys.active)
      // ainda aceitaria a credencial de uma conta bloqueada.
      // O trigger trg_revoke_api_keys_on_block faz o mesmo no banco; esta
      // chamada cobre o caso em que o trigger ainda não foi aplicado.
      const { error: keyErr } = await supabaseAdmin
        .from('api_keys').update({ active: false }).eq('user_id', targetId).eq('active', true);
      if (keyErr) console.error('[approve-user] revogação de api_keys falhou:', keyErr.message);
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
        if (safe.permissions.length > 50) return json({ error: 'permissions excede o limite de 50 itens.' }, 400);
      }
      if (safe.level !== undefined) {
        if (safe.level === null || safe.level === '') {
          delete safe.level;
        } else {
          const VALID_LEVELS_UPD = ['tecnico', 'intermediario', 'avancado'];
          if (!VALID_LEVELS_UPD.includes(safe.level as string))
            return json({ error: 'Level inválido.' }, 400);
        }
      }
      if (safe.name !== undefined) {
        const trimmed = String(safe.name).trim();
        if (!trimmed || trimmed.length > 120) return json({ error: 'Nome inválido (máx. 120 caracteres).' }, 400);
        safe.name = trimmed;
      }
      // SECURITY: approvedBy é a autoria registrada na auditoria — aceitar
      // qualquer id permitiria falsificar quem aprovou o usuário.
      if (safe.approvedBy !== undefined && safe.approvedBy !== null) {
        const approver = String(safe.approvedBy).trim();
        if (!approver) delete safe.approvedBy;
        else if (approver !== user.id) {
          return json({ error: 'approvedBy só pode ser o próprio usuário autenticado.' }, 403);
        } else safe.approvedBy = approver;
      }
      // accessType/accessExpires não são usados para autorização (só role,
      // status, permissions e plan são), mas ficam restritos a valores válidos
      // para não sujar o registro com lixo.
      if (safe.accessType !== undefined && safe.accessType !== null) {
        const VALID_ACCESS = ['trial', 'subscription', 'full'];
        if (!VALID_ACCESS.includes(safe.accessType as string)) {
          return json({ error: 'accessType inválido.' }, 400);
        }
      }
      if (safe.accessExpires !== undefined && safe.accessExpires !== null) {
        const expires = Number(safe.accessExpires);
        if (!Number.isFinite(expires) || expires <= 0) {
          return json({ error: 'accessExpires deve ser um timestamp válido.' }, 400);
        }
        safe.accessExpires = expires;
      }
      if (safe.role !== undefined) {
        const trimmed = String(safe.role).trim();
        if (!trimmed) return json({ error: 'Role inválido.' }, 400);
        safe.role = trimmed;
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
    console.error('[approve-user] unhandled:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Erro interno do servidor.' }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}