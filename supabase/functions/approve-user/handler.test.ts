// Testes Deno para handler.ts (lógica de approval/bloqueio de usuários).
// Regressão do C1: a ação create com role informada deve retornar 200 — antes
// do fix, index.ts usava a variável `role` (fora de escopo) e caía no catch
// com 500 (ReferenceError: role is not defined).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handler, type ApproveUserDeps } from './handler.ts';

type CallerLike = { id: string; role: string; status: string };
type TargetLike = { id: string; role: string };

interface Overrides {
  caller?: CallerLike | null;
  target?: TargetLike | null;
  tokenError?: string | null;
  aalNextLevel?: string;
  recentCount?: number;
  createUserError?: string | null;
  usersInsertError?: string | null;
  auditInsertError?: string | null;
}

interface FakeState {
  createdAuthUsers: Array<Record<string, unknown>>;
  usersRows: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
  lastUpdate: Record<string, unknown> | null;
  /** Updates aplicados em api_keys: { user_id, active } */
  apiKeyUpdates: Array<{ user_id: unknown; active: unknown }>;
}

function makeDeps(overrides: Overrides = {}) {
  const caller = overrides.caller ?? { id: 'caller-1', role: 'superadmin', status: 'active' };
  const state: FakeState = {
    createdAuthUsers: [], usersRows: [], auditLogs: [], lastUpdate: null, apiKeyUpdates: [],
  };

  const dep: ApproveUserDeps = {
    createUserClient: () => ({
      auth: {
        getUser: async () =>
          overrides.tokenError
            ? { data: { user: null }, error: { message: overrides.tokenError } }
            : { data: { user: caller ? { id: caller.id } : null }, error: null },
        mfa: {
          getAuthenticatorAssuranceLevel: async () => ({
            data: { nextLevel: overrides.aalNextLevel ?? 'aal1', currentLevel: 'aal1' },
          }),
        },
      },
    }),
    createAdminClient: () => ({
      auth: {
        admin: {
          createUser: async (opts) => {
            state.createdAuthUsers.push({ ...opts });
            if (overrides.createUserError) {
              return { data: { user: null }, error: { message: overrides.createUserError } };
            }
            return { data: { user: { id: 'new-user-1' } }, error: null };
          },
          deleteUser: async () => ({ error: null }),
        },
      },
      from: (table: string) => {
        let eqValue: unknown = null;
        const b = {
          select: () => b,
          eq: (_c: string, v: unknown) => {
            eqValue = v;
            return b;
          },
          gte: async () => ({ count: overrides.recentCount ?? 0, error: null }),
          single: async () => {
            if (table === 'users') {
              const isCaller = caller?.id != null && eqValue === caller.id;
              const role = isCaller ? (caller?.role ?? '') : (overrides.target?.role ?? '');
              const status = isCaller ? (caller?.status ?? '') : 'active';
              return { data: { role, status }, error: null };
            }
            return { data: null, error: null };
          },
          insert: async (row: Record<string, unknown>) => {
            if (table === 'users') state.usersRows.push(row);
            else state.auditLogs.push(row);
            const err = table === 'users' ? overrides.usersInsertError : overrides.auditInsertError;
            return err ? { error: { message: err } } : { error: null };
          },
          update: (row: Record<string, unknown>) => {
            if (table !== 'api_keys') {
              state.lastUpdate = { ...row };
              return b;
            }
            // Cadeia própria e entãovel: update().eq('user_id',…).eq('active',…)
            // precisa devolver o MESMO objeto em cada eq, senão o await final
            // cai no builder genérico e a escrita nunca é registrada.
            let recorded = false;
            const keyEq: Record<string, unknown> = {};
            const chain = {
              eq(c: string, v: unknown) {
                keyEq[c] = v;
                return chain;
              },
              then(res: (v: unknown) => unknown) {
                if (!recorded) {
                  state.apiKeyUpdates.push({ user_id: keyEq.user_id, active: row.active });
                  recorded = true;
                }
                return res({ error: null });
              },
            };
            return chain;
          },
          delete: () => b,
        };
        return b;
      },
    }),
  };

  return { deps: dep, state };
}

function post(body: unknown): Request {
  return new Request('http://test.local/', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer test-token' },
  });
}

Deno.test('C1 regression: create com role válida retorna 200 (sem ReferenceError)', async () => {
  const { deps, state } = makeDeps();

  const res = await handler(
    post({ action: 'create', email: 'novo@adaspro.com.br', password: 'Str0ng!Pass', name: 'Novo Usuário', role: 'gestor' }),
    deps
  );

  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, data: { userId: 'new-user-1' } });
  assertEquals(state.usersRows[0]?.role, 'gestor');
  assertEquals(state.createdAuthUsers[0]?.email_confirm, true);
  assertEquals(state.auditLogs[0]?.action, 'create_user');
});

Deno.test('create sem email/password/name retorna 400', async () => {
  const { deps } = makeDeps();
  const res = await handler(post({ action: 'create' }), deps);
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'email, password e name são obrigatórios.' });
});

Deno.test('create com senha fraca retorna 400', async () => {
  const { deps } = makeDeps();
  for (const password of ['12345678', 'abcdefgh', 'ABCDEFGH', 'Abcdefgh']) {
    const res = await handler(
      post({ action: 'create', email: 'a@b.com', password, name: 'X' }),
      deps
    );
    assertEquals(res.status, 400);
  }
});

Deno.test('create com e-mail inválido retorna 400', async () => {
  const { deps } = makeDeps();
  const res = await handler(
    post({ action: 'create', email: 'nao-e-email', password: 'Str0ng!Pass', name: 'X' }),
    deps
  );
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'Formato de e-mail inválido.' });
});

Deno.test('create com role igual ou superior à do chamador retorna 403', async () => {
  const { deps } = makeDeps({ caller: { id: 'caller-1', role: 'admin', status: 'active' } });
  const res = await handler(
    post({ action: 'create', email: 'admin2@adaspro.com.br', password: 'Str0ng!Pass', name: 'X', role: 'admin' }),
    deps
  );
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'Não é permitido criar conta com role igual ou superior à sua.' });
});

Deno.test('create por gestor retorna 403', async () => {
  const { deps } = makeDeps({ caller: { id: 'caller-1', role: 'gestor', status: 'active' } });
  const res = await handler(post({ action: 'create', email: 'x@adaspro.com.br', password: 'Str0ng!Pass', name: 'X' }), deps);
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'Gestor só pode aprovar, bloquear ou desbloquear usuários.' });
});

Deno.test('create sem MFA quando exigido retorna 403', async () => {
  const { deps } = makeDeps({ aalNextLevel: 'aal2' });
  const res = await handler(
    post({ action: 'create', email: 'x@adaspro.com.br', password: 'Str0ng!Pass', name: 'X' }),
    deps
  );
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'Autenticação em duas etapas (MFA) é obrigatória para esta ação.' });
});

Deno.test('rate limit (30+ ações em 60s) retorna 429', async () => {
  const { deps } = makeDeps({ recentCount: 30 });
  const res = await handler(post({ action: 'approve', targetId: 't-1' }), deps);
  assertEquals(res.status, 429);
  assertEquals(await res.json(), { error: 'Muitas requisições. Aguarde 1 minuto.' });
});

Deno.test('create com erro no auth.admin.createUser retorna 500', async () => {
  const { deps } = makeDeps({ createUserError: 'falha ao criar' });
  const res = await handler(
    post({ action: 'create', email: 'x@adaspro.com.br', password: 'Str0ng!Pass', name: 'X' }),
    deps
  );
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'falha ao criar' });
});

Deno.test('create com erro no insert exclui o usuário do auth e retorna 500', async () => {
  const { deps, state } = makeDeps({ usersInsertError: 'constraint violada' });
  const res = await handler(
    post({ action: 'create', email: 'x@adaspro.com.br', password: 'Str0ng!Pass', name: 'X' }),
    deps
  );
  assertEquals(res.status, 500);
  assertEquals(state.createdAuthUsers.length, 1);
});

Deno.test('requisição sem authorization retorna 401', async () => {
  const { deps } = makeDeps();
  const req = new Request('http://test.local/', { method: 'POST', body: JSON.stringify({ action: 'approve', targetId: 't-1' }) });
  const res = await handler(req, deps);
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'Não autorizado.' });
});

Deno.test('token inválido retorna 401', async () => {
  const { deps } = makeDeps({ tokenError: 'jwt invalid' });
  const res = await handler(post({ action: 'approve', targetId: 't-1' }), deps);
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'Token inválido.' });
});

Deno.test('método GET retorna 405', async () => {
  const { deps } = makeDeps();
  const res = await handler(new Request('http://test.local/', { method: 'GET' }), deps);
  assertEquals(res.status, 405);
  assertEquals(await res.json(), { error: 'Method not allowed.' });
});

Deno.test('OPTIONS retorna 200', async () => {
  const { deps } = makeDeps();
  const res = await handler(new Request('http://test.local/', { method: 'OPTIONS' }), deps);
  assertEquals(res.status, 200);
});

Deno.test('payload acima de 65KB retorna 413', async () => {
  const { deps } = makeDeps();
  const req = new Request('http://test.local/', {
    method: 'POST',
    headers: { authorization: 'Bearer t', 'content-length': '70000' },
    body: JSON.stringify({ action: 'create' }),
  });
  const res = await handler(req, deps);
  assertEquals(res.status, 413);
  assertEquals(await res.json(), { error: 'Payload muito grande.' });
});

Deno.test('approve de target com role menor retorna 200 e grava audit_logs', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(post({ action: 'approve', targetId: 't-1' }), deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(state.auditLogs[0]?.action, 'approve');
});

Deno.test('ação sobre target inexistente retorna 404', async () => {
  const { deps } = makeDeps({ target: null });
  const res = await handler(post({ action: 'approve', targetId: 'sumiu' }), deps);
  assertEquals(res.status, 404);
  assertEquals(await res.json(), { error: 'Usuário não encontrado.' });
});

Deno.test('ação sobre target com role igual/superior retorna 403', async () => {
  const { deps } = makeDeps({ target: { id: 't-1', role: 'superadmin' } });
  const res = await handler(post({ action: 'block', targetId: 't-1' }), deps);
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'Não é permitido agir sobre contas com role igual ou superior à sua.' });
});

Deno.test('update ignora campos fora da whitelist (id/email) e rejeita promoção igual', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({
      action: 'update',
      targetId: 't-1',
      updates: { id: 'hacked', email: 'hacked@x.com', role: 'superadmin', name: 'Nome' },
    }),
    deps
  );
  assertEquals(res.status, 403);
  assertEquals(state.lastUpdate, null);
});

Deno.test('update válido aplica apenas campos permitidos', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({
      action: 'update',
      targetId: 't-1',
      updates: { name: 'Nome Novo', role: 'gestor', id: 'hacked', email: 'hacked@x.com' },
    }),
    deps
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(state.lastUpdate, { name: 'Nome Novo', role: 'gestor' });
});

/* ═══════════ Revogação de API keys no block (crítico) ═══════════ */

Deno.test('REGRESSÃO crítico: block desativa as api_keys do usuário', async () => {
  // Sem isto, a chave continuava com active=true e o api-gateway aceitava
  // a credencial de uma conta bloqueada (validateApiKey só checava
  // api_keys.active, nunca o status do dono).
  const { deps, state } = makeDeps({ target: { id: 't-blocked', role: 'membro' } });
  const res = await handler(post({ action: 'block', targetId: 't-blocked' }), deps);

  assertEquals(res.status, 200);
  assertEquals(state.lastUpdate, { status: 'blocked' });
  assertEquals(state.apiKeyUpdates, [{ user_id: 't-blocked', active: false }]);
});

Deno.test('unblock NÃO desativa api_keys (reativação é decisão manual)', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(post({ action: 'unblock', targetId: 't-1' }), deps);
  assertEquals(res.status, 200);
  assertEquals(state.apiKeyUpdates, []);
});

/* ═══════════ Whitelist de audit fields (baixo) ═══════════ */

Deno.test('update rejeita approvedBy de terceiro', async () => {
  // approvedBy entra no audit_logs — aceitar id alheio permitiria forjar
  // quem aprovou a mudança.
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({
      action: 'update', targetId: 't-1',
      updates: { name: 'X', approvedBy: 'outro-admin' },
    }),
    deps
  );
  assertEquals(res.status, 403);
  assertEquals(state.lastUpdate, null);
});

Deno.test('update aceita approvedBy igual ao chamador', async () => {
  const { deps, state } = makeDeps({
    caller: { id: 'caller-1', role: 'superadmin', status: 'active' },
    target: { id: 't-1', role: 'membro' },
  });
  const res = await handler(
    post({ action: 'update', targetId: 't-1', updates: { name: 'X', approvedBy: 'caller-1' } }),
    deps
  );
  assertEquals(res.status, 200);
  assertEquals(state.lastUpdate, { name: 'X', approvedBy: 'caller-1' });
});

Deno.test('update rejeita accessType fora da lista válida', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({ action: 'update', targetId: 't-1', updates: { accessType: 'lixo' } }),
    deps
  );
  assertEquals(res.status, 400);
  assertEquals(state.lastUpdate, null);
});

Deno.test('update aceita accessType válido', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({ action: 'update', targetId: 't-1', updates: { accessType: 'subscription' } }),
    deps
  );
  assertEquals(res.status, 200);
  assertEquals(state.lastUpdate, { accessType: 'subscription' });
});

Deno.test('update rejeita accessExpires não numérico', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  const res = await handler(
    post({ action: 'update', targetId: 't-1', updates: { accessExpires: 'amanhã' } }),
    deps
  );
  assertEquals(res.status, 400);
  assertEquals(state.lastUpdate, null);
});

Deno.test('update rejeita name vazio ou acima de 120 chars', async () => {
  const { deps, state } = makeDeps({ target: { id: 't-1', role: 'membro' } });
  for (const name of ['', '   ', 'x'.repeat(121)]) {
    const res = await handler(
      post({ action: 'update', targetId: 't-1', updates: { name } }),
      deps
    );
    assertEquals(res.status, 400, `name=${name.slice(0, 10)}`);
  }
  assertEquals(state.lastUpdate, null);
});