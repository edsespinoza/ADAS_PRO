// Testes da lógica da Edge Function `notify` (sem runtime Deno / sem rede).
// Rode: npx deno test --allow-all supabase/functions/notify/handler.test.ts
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildMessage, handler, __testing } from './handler.ts';
import type { NotifyDeps } from './handler.ts';

const SITE = 'https://adaspro.com.br';
const ADMIN = 'admin@adaspro.com.br';

interface Overrides {
  resendKey?: string | null;
  caller?: { id: string; role: string; status: string } | null;
  userError?: boolean;
  aalError?: boolean;
  aalNull?: boolean;
  aalNextLevel?: string;
  aalCurrentLevel?: string;
  recentCount?: number;
  dayCount?: number;
  recipient?: { status: string } | null;
  sendOk?: boolean;
  sendErrText?: string;
  body?: unknown;
  rawBody?: string;
}

function makeDeps(over: Overrides = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const audit: Array<Record<string, unknown>> = [];
  const caller = over.caller === undefined ? { id: 'u1', role: 'admin', status: 'active' } : over.caller;

  let gteCalls = 0;
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    gte: () => {
      gteCalls++;
      const count = gteCalls === 1 ? (over.recentCount ?? 0) : (over.dayCount ?? 0);
      return Promise.resolve({ count, error: null });
    },
    single: async () =>
      caller
        ? { data: { role: caller.role, status: caller.status }, error: null }
        : { data: null, error: null },
    maybeSingle: async () => ({
      data: over.recipient === undefined ? { status: 'active' } : over.recipient,
      error: null,
    }),
    insert: async (row: Record<string, unknown>) => {
      audit.push(row);
      return { error: null };
    },
  };

  const resendKey = over.resendKey === undefined ? 'test-key' : over.resendKey;

  const deps: NotifyDeps = {
    resendKey: resendKey === null ? undefined : resendKey,
    adminEmail: ADMIN,
    siteUrl: SITE,
    now: 1_700_000_000_000,
    createUserClient: () => ({
      auth: {
        getUser: async () =>
          over.userError
            ? { data: { user: null }, error: { message: 'invalid jwt' } }
            : { data: { user: caller ? { id: caller.id } : null }, error: null },
        mfa: {
          getAuthenticatorAssuranceLevel: async () => {
            if (over.aalError) return { data: null, error: { message: 'boom' } };
            if (over.aalNull) return { data: null, error: null };
            return {
              data: {
                nextLevel: over.aalNextLevel ?? 'aal1',
                currentLevel: over.aalCurrentLevel ?? 'aal1',
              },
              error: null,
            };
          },
        },
      },
    }) as unknown as ReturnType<NotifyDeps['createUserClient']>,
    createAdminClient: () => ({ from: () => builder }),
    sendEmail: async (p) => {
      sent.push(p as unknown as Record<string, unknown>);
      return { ok: over.sendOk ?? true, text: async () => over.sendErrText ?? '' };
    },
  };

  return { deps, sent, audit };
}

function req(opts: {
  method?: string;
  auth?: string | null;
  body?: unknown;
  rawBody?: string;
  contentType?: string | null;
  contentLength?: string | null;
}) {
  const headers = new Headers();
  if (opts.auth !== null && opts.auth !== undefined) headers.set('authorization', opts.auth);
  if (opts.contentType !== null && opts.contentType !== undefined) headers.set('content-type', opts.contentType);
  else if (opts.body !== undefined || opts.rawBody !== undefined) headers.set('content-type', 'application/json');
  if (opts.contentLength) headers.set('content-length', opts.contentLength);
  const raw = opts.rawBody !== undefined ? opts.rawBody : opts.body !== undefined ? JSON.stringify(opts.body) : '';
  return {
    method: opts.method ?? 'POST',
    headers,
    json: async () => {
      if (opts.rawBody !== undefined) return JSON.parse(opts.rawBody);
      return opts.body;
    },
  } as unknown as Request;
}

async function body(res: Response) {
  return await res.json();
}

/* ─── buildMessage (puro) ─── */

Deno.test('buildMessage: new_user monta para o admin, com escape de HTML', () => {
  const r = buildMessage(
    'new_user',
    { userName: '<script>alert(1)</script>', userEmail: 'x@y.com' },
    { adminEmail: ADMIN, siteUrl: SITE },
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.to, ADMIN);
    assertStringIncludes(r.subject, 'Novo cadastro pendente');
    assertStringIncludes(r.html, '&lt;script&gt;alert(1)&lt;/script&gt;');
  }
});

Deno.test('buildMessage: validações por evento', () => {
  const ctx = { adminEmail: ADMIN, siteUrl: SITE };
  assertEquals(buildMessage('new_user', {}, ctx), { ok: false, status: 400, error: 'userName obrigatório.' });
  assertEquals(buildMessage('new_user', { userName: 'a'.repeat(121) }, ctx), { ok: false, status: 400, error: 'userName excede 120 caracteres.' });
  assertEquals(buildMessage('user_approved', { userEmail: 'nope', userName: 'A' }, ctx), { ok: false, status: 400, error: 'Formato de e-mail inválido.' });
  assertEquals(buildMessage('ticket_reply', { userEmail: 'a@b.com' }, ctx), { ok: false, status: 400, error: 'ticketTitle obrigatório.' });
  assertEquals(buildMessage('new_lead', { leadName: 'X' }, ctx), { ok: false, status: 400, error: 'leadEmail obrigatório.' });
  assertEquals(buildMessage('bogus', {}, ctx), { ok: false, status: 400, error: 'Evento inválido.' });
});

Deno.test('buildMessage: destinatário do membro em minúsculas', () => {
  const ctx = { adminEmail: ADMIN, siteUrl: SITE };
  const r = buildMessage('user_approved', { userEmail: '  Foo@Bar.COM ', userName: 'Ana Silva' }, ctx);
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.to, 'foo@bar.com');
});

/* ─── handler: método / payload ─── */

Deno.test('OPTIONS → 200 com CORS do siteUrl', async () => {
  const { deps } = makeDeps({ resendKey: null });
  const res = await handler(req({ method: 'OPTIONS' }), deps);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('access-control-allow-origin'), SITE);
});

Deno.test('método ≠ POST → 405', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ method: 'GET', auth: 'Bearer x' }), deps);
  assertEquals(res.status, 405);
});

Deno.test('payload > 64KB → 413', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ auth: 'Bearer x', contentLength: '70000', body: {} }), deps);
  assertEquals(res.status, 413);
});

/* ─── handler: config / auth ─── */

Deno.test('RESEND_API_KEY ausente → 500', async () => {
  const { deps } = makeDeps({ resendKey: null });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 500);
  assertEquals((await body(res)).error, 'RESEND_API_KEY não configurada.');
});

Deno.test('sem header authorization → 401', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ auth: null, body: {} }), deps);
  assertEquals(res.status, 401);
  assertEquals((await body(res)).error, 'Não autorizado.');
});

Deno.test('token inválido → 401', async () => {
  const { deps } = makeDeps({ userError: true });
  const res = await handler(req({ auth: 'Bearer bad', body: {} }), deps);
  assertEquals(res.status, 401);
  assertEquals((await body(res)).error, 'Token inválido.');
});

Deno.test('role não permitida (membro) → 403', async () => {
  const { deps } = makeDeps({ caller: { id: 'u1', role: 'membro', status: 'active' } });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 403);
  assertEquals((await body(res)).error, 'Permissão insuficiente.');
});

Deno.test('gestor e superadmin passam o gate de role', async () => {
  const data = { event: 'new_user', data: { userName: 'Ana' } };
  for (const role of ['gestor', 'superadmin']) {
    const { deps, sent } = makeDeps({ caller: { id: 'u1', role, status: 'active' } });
    const res = await handler(req({ auth: 'Bearer x', body: data }), deps);
    assertEquals(res.status, 200, `role ${role}`);
    assertEquals(sent.length, 1);
  }
});

Deno.test('conta não ativa → 403', async () => {
  for (const status of ['pending', 'blocked']) {
    const { deps } = makeDeps({ caller: { id: 'u1', role: 'admin', status } });
    const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
    assertEquals(res.status, 403, status);
    assertEquals((await body(res)).error, 'Conta inativa ou pendente de aprovação.');
  }
});

Deno.test('MFA: erro → 403', async () => {
  const { deps } = makeDeps({ aalError: true });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 403);
  assertEquals((await body(res)).error, 'Falha ao verificar MFA.');
});

Deno.test('MFA: aalData nulo → 403', async () => {
  const { deps } = makeDeps({ aalNull: true });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 403);
});

Deno.test('MFA: aal2 pendente → 403; aal2 cumprido → passa', async () => {
  const data = { event: 'new_user', data: { userName: 'Ana' } };

  const pending = makeDeps({ aalNextLevel: 'aal2', aalCurrentLevel: 'aal1' });
  assertEquals((await handler(req({ auth: 'Bearer x', body: data }), pending.deps)).status, 403);

  const done = makeDeps({ aalNextLevel: 'aal2', aalCurrentLevel: 'aal2' });
  assertEquals((await handler(req({ auth: 'Bearer x', body: data }), done.deps)).status, 200);
});

/* ─── handler: rate limit ─── */

Deno.test('rate limit 20/min → 429', async () => {
  const { deps } = makeDeps({ recentCount: 20 });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 429);
  assertEquals((await body(res)).error, 'Muitas requisições. Aguarde 1 minuto.');
});

Deno.test('rate limit 100/dia → 429', async () => {
  const { deps } = makeDeps({ dayCount: 100 });
  const res = await handler(req({ auth: 'Bearer x', body: {} }), deps);
  assertEquals(res.status, 429);
  assertEquals((await body(res)).error, 'Limite diário de envios atingido.');
});

/* ─── handler: payload ─── */

Deno.test('payload sem event/data → 400', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ auth: 'Bearer x', body: { data: {} } }), deps);
  assertEquals(res.status, 400);
  assertEquals((await body(res)).error, 'Payload inválido: event e data obrigatórios.');
});

Deno.test('evento inválido → 400', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ auth: 'Bearer x', body: { event: 'bogus', data: {} } }), deps);
  assertEquals(res.status, 400);
  assertEquals((await body(res)).error, 'Evento inválido.');
});

Deno.test('JSON inválido → 500', async () => {
  const { deps } = makeDeps();
  const res = await handler(req({ auth: 'Bearer x', rawBody: '{not json' }), deps);
  assertEquals(res.status, 500);
});

/* ─── handler: destinatário + envio ─── */

Deno.test('user_approved com destinatário inativo → 400', async () => {
  const { deps } = makeDeps({ recipient: null });
  const res = await handler(
    req({ auth: 'Bearer x', body: { event: 'user_approved', data: { userEmail: 'a@b.com', userName: 'Ana' } } }),
    deps,
  );
  assertEquals(res.status, 400);
  assertEquals((await body(res)).error, 'Destinatário não encontrado ou inativo.');
});

Deno.test('ticket_reply com destinatário inativo → 400', async () => {
  const { deps } = makeDeps({ recipient: { status: 'blocked' } });
  const res = await handler(
    req({ auth: 'Bearer x', body: { event: 'ticket_reply', data: { userEmail: 'a@b.com', ticketTitle: 'T', message: 'M' } } }),
    deps,
  );
  assertEquals(res.status, 400);
});

Deno.test('new_user válido → 200, envia ao admin e audita', async () => {
  const { deps, sent, audit } = makeDeps();
  const res = await handler(req({ auth: 'Bearer x', body: { event: 'new_user', data: { userName: 'Ana Silva', userEmail: 'ana@x.com' } } }), deps);
  assertEquals(res.status, 200);
  assertEquals(await body(res), { ok: true });
  assertEquals(sent.length, 1);
  assertEquals(sent[0].to, ADMIN);
  assertStringIncludes(String(sent[0].subject), 'Ana Silva');
  assertStringIncludes(String(sent[0].from), 'noreply@adaspro.com.br');
  assertEquals(audit.length, 1);
  assertEquals(audit[0].action, 'notify');
  assertEquals(audit[0].actor_id, 'u1');
});

Deno.test('user_approved válido → 200, envia ao membro (minúsculas)', async () => {
  const { deps, sent } = makeDeps();
  const res = await handler(
    req({ auth: 'Bearer x', body: { event: 'user_approved', data: { userEmail: 'FOO@Bar.com', userName: 'Ana' } } }),
    deps,
  );
  assertEquals(res.status, 200);
  assertEquals(sent[0].to, 'foo@bar.com');
});

Deno.test('ticket_reply válido → 200', async () => {
  const { deps, sent } = makeDeps();
  const res = await handler(
    req({ auth: 'Bearer x', body: { event: 'ticket_reply', data: { userEmail: 'a@b.com', ticketTitle: 'Erro ACC', message: 'Feito' } } }),
    deps,
  );
  assertEquals(res.status, 200);
  assertEquals(sent[0].to, 'a@b.com');
  assertStringIncludes(String(sent[0].subject), 'Erro ACC');
});

Deno.test('new_lead válido → 200, envia ao admin', async () => {
  const { deps, sent } = makeDeps();
  const res = await handler(
    req({ auth: 'Bearer x', body: { event: 'new_lead', data: { leadName: 'João', leadEmail: 'joao@x.com', leadPhone: '11999999999' } } }),
    deps,
  );
  assertEquals(res.status, 200);
  assertEquals(sent[0].to, ADMIN);
});

Deno.test('falha da Resend → 500', async () => {
  const { deps } = makeDeps({ sendOk: false, sendErrText: 'resend down' });
  const res = await handler(req({ auth: 'Bearer x', body: { event: 'new_user', data: { userName: 'Ana' } } }), deps);
  assertEquals(res.status, 500);
  assertEquals((await body(res)).error, 'Falha ao enviar email.');
});

/* ─── constantes exportadas ─── */

Deno.test('__testing expõe gate e limite de payload', () => {
  assertEquals(__testing.ALLOWED_ROLES, ['gestor', 'admin', 'superadmin']);
  assertEquals(__testing.MAX_BODY_BYTES, 65536);
});
