// Testes Deno para api-gateway/handler.ts.
//
// Cobre os fixes de segurança críticos da rodada de 2026-09:
//   - MFA (aal2) obrigatório nas ações sensíveis
//   - API key rejeitada quando o dono está bloqueado/pendente
//   - API key órfã (user_id NULL) rejeitada
//   - filePath do catálogo (path de Storage correto)
//   - avaliação de acesso por permissão/plano/módulo
//   - limite de payload e validação de contentId

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CONTENT_MAP, RATE_LIMIT, bodyTooLarge, checkRateLimit, evaluateAccess,
  isValidContentId, paginate, readJsonBody, requireMfa, validateApiKey,
  type ApiKeyDeps, type ContentItem,
} from './handler.ts';

const OWNER = { id: 'u-1', role: 'membro', status: 'active', permissions: ['honda'] as string[], plan: 'pro' };
const ITEM = CONTENT_MAP['honda-lkas'];

/* ─── deps de API key ─── */
interface KeyDeps {
  key?: { user_id: string | null; plan: string; active: boolean } | null;
  owner?: { id: string; role: string; status: string; permissions: string[]; plan: string } | null;
}

function makeKeyDeps(over: KeyDeps = {}): ApiKeyDeps {
  return {
    lookupKey: async () => over.key !== undefined ? over.key : { user_id: OWNER.id, plan: 'premium', active: true },
    loadOwner: async () => over.owner !== undefined ? over.owner : OWNER,
    sha256: async (s) => 'hash:' + s,
  };
}

const KEY = 'adas_live_abc123';

/* ═══════════ API KEY ═══════════ */

Deno.test('API key: dono ativo é aceito', async () => {
  const r = await validateApiKey(KEY, makeKeyDeps());
  assertEquals(r, { valid: true, userId: OWNER.id, plan: 'premium' });
});

Deno.test('API key: prefixo inválido é rejeitado', async () => {
  assertEquals(await validateApiKey('sk-nao-adas', makeKeyDeps()), { valid: false });
  assertEquals(await validateApiKey('', makeKeyDeps()), { valid: false });
});

Deno.test('API key: inativa é rejeitada', async () => {
  const r = await validateApiKey(KEY, makeKeyDeps({ key: { user_id: OWNER.id, plan: 'premium', active: false } }));
  assertEquals(r, { valid: false });
});

Deno.test('REGRESSÃO crítico: API key de usuário BLOQUEADO é rejeitada', async () => {
  // Antes: validateApiKey só checava api_keys.active e devolvia valid:true —
  // o block() no approve-user não revogava a chave, então a credencial da
  // conta bloqueada continuava autenticando no gateway.
  const r = await validateApiKey(KEY, makeKeyDeps({
    key: { user_id: OWNER.id, plan: 'premium', active: true },
    owner: { ...OWNER, status: 'blocked' },
  }));
  assertEquals(r, { valid: false });
});

Deno.test('API key: dono pendente é rejeitado', async () => {
  const r = await validateApiKey(KEY, makeKeyDeps({ owner: { ...OWNER, status: 'pending' } }));
  assertEquals(r, { valid: false });
});

Deno.test('API key: dono removido do public.users é rejeitado', async () => {
  const r = await validateApiKey(KEY, makeKeyDeps({ owner: null }));
  assertEquals(r, { valid: false });
});

Deno.test('API key órfã (user_id NULL) é rejeitada', async () => {
  // O DDL permite user_id NULL. Sem esta guarda, userId ficava undefined e
  // os endpoints assumiam uma identidade válida.
  const r = await validateApiKey(KEY, makeKeyDeps({ key: { user_id: null, plan: 'premium', active: true } }));
  assertEquals(r, { valid: false });
});

Deno.test('API key inexistente no banco é rejeitada', async () => {
  assertEquals(await validateApiKey(KEY, makeKeyDeps({ key: null })), { valid: false });
});

/* ═══════════ MFA ═══════════ */

Deno.test('MFA: sessão aal1 com MFA configurado é bloqueada', async () => {
  const r = await requireMfa({ data: { nextLevel: 'aal2', currentLevel: 'aal1' } });
  assertEquals(r.ok, false);
});

Deno.test('MFA: sessão aal2 passa', async () => {
  assertEquals(await requireMfa({ data: { nextLevel: 'aal2', currentLevel: 'aal2' } }), { ok: true });
});

Deno.test('MFA: conta sem MFA configurado (nextLevel aal1) passa', async () => {
  assertEquals(await requireMfa({ data: { nextLevel: 'aal1', currentLevel: 'aal1' } }), { ok: true });
});

Deno.test('MFA: resposta ausente/erro do Supabase é fail-closed', async () => {
  assertEquals((await requireMfa(null)).ok, false);
  assertEquals((await requireMfa({ data: null })).ok, false);
  assertEquals((await requireMfa({ error: new Error('boom') })).ok, false);
});

/* ═══════════ Conteúdo / Storage path ═══════════ */

Deno.test('REGRESSÃO alto: todo item tem filePath válido ou null explícito', () => {
  // Antes o gateway derivava `${cat}/${id}.pdf`, produzindo
  // `honda/honda-lkas.pdf` para o arquivo real `honda/honda-lkas-calibration.pdf`
  // — todo download da API retornava 404.
  // null é legítimo: material catalogado mas ainda não enviado ao Storage.
  const semArquivo: string[] = [];
  for (const [id, item] of Object.entries(CONTENT_MAP)) {
    if (item.filePath === null) {
      semArquivo.push(id);
      continue;
    }
    assertEquals(typeof item.filePath, 'string', `${id} sem filePath`);
    assertEquals(item.filePath.endsWith('.pdf'), true, `${id} filePath não é .pdf`);
    assertEquals(item.filePath.includes('//'), false, `${id} filePath com barra dupla`);
    assertEquals(item.filePath.startsWith(item.cat), true, `${id} filePath fora da categoria`);
  }
  // Guard explícito: ampliar esta lista exige revisar o comportamento de download.
  assertEquals(semArquivo.sort(), ['honda-acc', 'nissan-radar']);
});

Deno.test('filePath de honda-lkas é o caminho real do Storage', () => {
  assertEquals(CONTENT_MAP['honda-lkas'].filePath, 'honda/honda-lkas-calibration.pdf');
  assertEquals(CONTENT_MAP['audi-lidar'].filePath, 'vag/audi-lidar-vas6430.pdf');
});

/* ═══════════ Autorização de conteúdo ═══════════ */

Deno.test('acesso: membro com a categoria e plano suficiente é autorizado', () => {
  const d = evaluateAccess(ITEM, { role: 'membro', permissions: ['honda'], plan: 'pro' });
  assertEquals(d.allowed, true);
});

Deno.test('acesso: membro SEM a categoria é negado', () => {
  const d = evaluateAccess(ITEM, { role: 'membro', permissions: ['toyota'], plan: 'premium' });
  assertEquals(d.allowed, false);
  if (!d.allowed) assertEquals(d.code, 'NO_PERMISSION');
});

Deno.test('acesso: plano free é negado em item de nível 2', () => {
  const d = evaluateAccess(ITEM, { role: 'membro', permissions: ['honda'], plan: 'free' });
  assertEquals(d.allowed, false);
  if (!d.allowed) assertEquals(d.code, 'PLAN_LEVEL');
});

Deno.test('acesso: módulo desativado nega membro mas não staff', () => {
  const mod = { enabled: false };
  const membro = evaluateAccess(ITEM, { role: 'membro', permissions: ['honda'], plan: 'pro' }, { moduleAccess: mod });
  assertEquals(membro.allowed, false);
  const staff = evaluateAccess(ITEM, { role: 'admin', permissions: [], plan: 'free' }, { moduleAccess: mod });
  assertEquals(staff.allowed, true);
});

Deno.test('acesso: minLevel do módulo nega plano baixo', () => {
  const d = evaluateAccess(ITEM, { role: 'membro', permissions: ['honda'], plan: 'pro' }, { moduleAccess: { minLevel: 4 } });
  assertEquals(d.allowed, false);
});

Deno.test('acesso: staff ignora plano e módulo', () => {
  for (const role of ['admin', 'gestor', 'superadmin']) {
    const d = evaluateAccess(ITEM, { role, permissions: [], plan: 'free' }, { moduleAccess: { enabled: false } });
    assertEquals(d.allowed, true, `${role} deveria passar`);
  }
});

Deno.test('acesso: item sem filePath retorna FILE_UNAVAILABLE quando needFile', () => {
  const semArquivo: ContentItem = { ...ITEM, filePath: null };
  const d = evaluateAccess(semArquivo, { role: 'admin', permissions: [], plan: 'premium' }, { needFile: true });
  assertEquals(d.allowed, false);
  if (!d.allowed) assertEquals(d.code, 'FILE_UNAVAILABLE');
});

/* ═══════════ Validação de entrada ═══════════ */

Deno.test('contentId: aceita id válido do catálogo', () => {
  assertEquals(isValidContentId('honda-lkas'), true);
});

Deno.test('contentId: rejeita injeção de path, vazio e tipos errados', () => {
  for (const bad of [
    '../../etc/passwd', 'honda/../toyota', 'honda-lkas.pdf', 'a b', '',
    'honda_lkas; DROP TABLE', 'x'.repeat(65), null, undefined, 42, {},
  ]) {
    assertEquals(isValidContentId(bad), false, `deveria rejeitar: ${JSON.stringify(bad)}`);
  }
});

/* ═══════════ Payload ═══════════ */

Deno.test('payload: content-length acima de 32KB é rejeitado no atalho', () => {
  const big = new Request('http://x/', {
    method: 'POST',
    body: 'x'.repeat(33 * 1024),
    headers: { 'content-length': String(33 * 1024) },
  });
  assertEquals(bodyTooLarge(big), true);
});

Deno.test('payload: content-length pequeno é aceito no atalho', () => {
  const small = new Request('http://x/', { method: 'POST', body: '{"a":1}' });
  assertEquals(bodyTooLarge(small), false);
});

Deno.test('REGRESSÃO médio: body grande SEM content-length é cortado no stream', async () => {
  // Bypass do atalho: o cliente omite o header (chunked). O `req.json()`
  // original lia o corpo inteiro em memória; readJsonBody() aborta no teto.
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      const chunk = new Uint8Array(16 * 1024);
      for (let i = 0; i < 4; i++) c.enqueue(chunk); // 64 KB, sem header
      c.close();
    },
  });
  const req = new Request('http://x/', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  assertEquals(req.headers.get('content-length'), null, 'premissa do teste: sem content-length');

  const r = await readJsonBody(req);
  assertEquals(r.ok, false);
  if (r.ok === false) assertEquals(r.tooLarge, true);
});

Deno.test('payload: objeto JSON válido é parseado', async () => {
  const req = new Request('http://x/', { method: 'POST', body: '{"action":"get_user"}' });
  const r = await readJsonBody(req);
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.data, { action: 'get_user' });
});

Deno.test('payload: JSON inválido, array e primitivo viram body vazio', async () => {
  for (const raw of ['{nao é json', '[1,2,3]', '"texto"', 'null', '42']) {
    const req = new Request('http://x/', { method: 'POST', body: raw });
    const r = await readJsonBody(req);
    assertEquals(r.ok, true, raw);
    if (r.ok) assertEquals(r.data, {}, raw);
  }
});

Deno.test('payload: sem body (GET) devolve objeto vazio', async () => {
  const r = await readJsonBody(new Request('http://x/'));
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.data, {});
});

/* ═══════════ Catálogo compartilhado ═══════════ */

Deno.test('REGRESSÃO alto: gateway e get-download-url usam o MESMO catálogo', async () => {
  // A divergência original: cópia própria no gateway com 13 de 23 itens.
  // O catálogo agora vive em _shared/content-map.ts e é importado pelas duas.
  const gdu = await Deno.readTextFile(
    new URL('../get-download-url/index.ts', import.meta.url),
  );
  assertEquals(
    gdu.includes("from '../_shared/content-map.ts'"),
    true,
    'get-download-url deve importar o catálogo compartilhado',
  );
  assertEquals(
    gdu.includes("content-map.ts'") && !/const CONTENT_MAP: Record/.test(gdu),
    true,
    'get-download-url não deve redefinir o mapa localmente',
  );
});

Deno.test('catálogo compartilhado tem 23 itens com categorias e níveis válidos', async () => {
  const shared = await import('../_shared/content-map.ts');
  const entries = Object.entries(shared.CONTENT_MAP);
  assertEquals(entries.length, 23);
  for (const [id, e] of entries) {
    assertEquals(typeof e.cat === 'string' && e.cat.length > 0, true, `${id} sem cat`);
    assertEquals([1, 2, 3, 4].includes(e.accessLevel), true, `${id} accessLevel inválido`);
    assertEquals([1, 2, 3, 4].includes(e.downloadLevel), true, `${id} downloadLevel inválido`);
    if (e.filePath) {
      assertEquals(e.filePath.startsWith(e.cat), true, `${id}: filePath fora da categoria`);
    }
  }
});

Deno.test('gateway expõe exatamente o catálogo compartilhado (nenhuma cópia)', async () => {
  const shared = await import('../_shared/content-map.ts');
  const gwIds = Object.keys(CONTENT_MAP).sort();
  assertEquals(gwIds, Object.keys(shared.CONTENT_MAP).sort());
  // Todo item do gateway tem que estar no compartilhado, com o mesmo path.
  for (const [id, item] of Object.entries(CONTENT_MAP)) {
    assertEquals(item.filePath, shared.CONTENT_MAP[id].filePath, `path divergente em ${id}`);
  }
});

/* ═══════════ Rate limit ═══════════ */

Deno.test('rate limit: conta abaixo do limite permite', async () => {
  const r = await checkRateLimit('ip:1.1.1.1', { incrementRateLimit: async () => 5 }, 0);
  assertEquals(r.allowed, true);
  assertEquals(r.remaining, RATE_LIMIT - 5);
});

Deno.test('rate limit: conta acima do limite bloqueia', async () => {
  const r = await checkRateLimit('ip:1.1.1.1', { incrementRateLimit: async () => RATE_LIMIT + 1 }, 0);
  assertEquals(r.allowed, false);
  assertEquals(r.remaining, 0);
});

Deno.test('rate limit: falha do banco é fail-open', async () => {
  const r = await checkRateLimit('ip:1.1.1.1', {
    incrementRateLimit: async () => { throw new Error('db down'); },
  }, 0);
  assertEquals(r.allowed, true);
});

/* ═══════════ Paginação ═══════════ */

Deno.test('paginação fatia e reporta total', () => {
  const r = paginate([1, 2, 3, 4, 5], 2, 2);
  assertEquals(r.data, [3, 4]);
  assertEquals(r.total, 5);
  assertEquals(r.page, 2);
  assertEquals(r.per_page, 2);
});
