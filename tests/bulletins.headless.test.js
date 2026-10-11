'use strict';

/*
 * Repro headless do caminho getBulletins → renderBulletinsDynamic (bug.md #1332).
 *
 * Carrega o js/auth.js REAL dentro de um jsdom (modo offline) e roda a
 * renderBulletinsDynamic REAL extraída de membros.html contra ele. Sem
 * suposições: o código de produção é exercitado de ponta a ponta.
 *
 * Rodar: npm test
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const AUTH_SRC = fs.readFileSync(path.join(ROOT, 'js', 'auth.js'), 'utf8');
const MEMBROS_SRC = fs.readFileSync(path.join(ROOT, 'membros.html'), 'utf8');

/* ─── Extrai o default seed e a SEED_VERSION do fonte (ficam no closure) ─── */
const DEFAULTS = eval(
  AUTH_SRC.match(/const DEFAULT_BULLETINS = (\[[\s\S]*?\n  \]);/)[1]
);
const SEED_VERSION = AUTH_SRC.match(/const SEED_VERSION = '([^']+)'/)[1];
const SEED = DEFAULTS[0];
const BULLETINS_KEY = 'adaspro_bulletins';

/* ─── Extrai funções reais de membros.html por escaneamento de chaves ─── */
function extractFn(src, name) {
  const m = new RegExp('(?:^|\\n)\\s*function\\s+' + name + '\\s*\\(').exec(src);
  assert.ok(m, `função não encontrada em membros.html: ${name}`);
  let depth = 0;
  const start = src.indexOf('{', m.index);
  for (let j = start; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(m.index, j + 1);
  }
  throw new Error(`chaves desbalanceadas: ${name}`);
}

const HELPERS_SRC = [
  extractFn(MEMBROS_SRC, 'esc'),
  extractFn(MEMBROS_SRC, 'fmtDate'),
  extractFn(MEMBROS_SRC, '_stripHtml'),
  extractFn(MEMBROS_SRC, 'renderBulletinsDynamic'),
].join('\n');

const BASE_HTML = `<!doctype html><html><body>
  <div class="blt-grid" id="bltGrid"></div>
  <span id="bltCountAll"></span>
  <span id="bltUnreadBadge" style="display:none"></span>
</body></html>`;

/* Sobe uma janela jsdom isolada com o auth.js e o renderer reais. */
function boot(seedList) {
  const dom = new JSDOM(BASE_HTML, {
    url: 'https://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  if (seedList) w.localStorage.setItem(BULLETINS_KEY, JSON.stringify(seedList));
  w.eval(AUTH_SRC + '\n;window.__AUTH__ = AUTH;');
  w.eval(HELPERS_SRC + '\n;window.__render = renderBulletinsDynamic;');
  w.AUTH = w.__AUTH__;
  w.storage = () => JSON.parse(w.localStorage.getItem(BULLETINS_KEY) || '[]');
  return w;
}

const storedSeed = (w) => w.storage().find((b) => b.id === SEED.id) || null;

/* ───────────────────────── getBulletins / seeding ─────────────────────── */

test('storage vazio → seed published materializa com _seedVersion', () => {
  const w = boot(null);
  const pubs = w.AUTH.getBulletins({ status: 'published' });
  assert.equal(pubs.length, 1);
  assert.equal(pubs[0].id, SEED.id);
  assert.equal(storedSeed(w)._seedVersion, SEED_VERSION);
});

test('seed obsoleto (mesmo updatedAt, SEM _seedVersion) → substituído pelo atual', () => {
  const w = boot([{ ...SEED, title: 'VERSÃO ANTIGA', _seedVersion: undefined }]);
  const pubs = w.AUTH.getBulletins({ status: 'published' });
  assert.equal(storedSeed(w).title, SEED.title, 'texto antigo deve ser substituído');
  assert.equal(storedSeed(w)._seedVersion, SEED_VERSION);
  assert.equal(pubs[0].title, SEED.title);
});

test('seed obsoleto (_seedVersion anterior) → substituído', () => {
  const w = boot([{ ...SEED, title: 'VERSÃO ANTIGA', _seedVersion: 'v1.0' }]);
  w.AUTH.getBulletins({ status: 'published' });
  assert.equal(storedSeed(w).title, SEED.title);
  assert.equal(storedSeed(w)._seedVersion, SEED_VERSION);
});

test('edição no painel (editBulletin) → marcada _userEdited e NUNCA sobrescrita, nem em bump', () => {
  const w = boot(null); // materializa o seed na versão vigente
  assert.equal(w.AUTH.getBulletins({ status: 'published' }).length, 1);
  assert.equal(w.AUTH.editBulletin(SEED.id, { title: 'EDITADO PELA EQUIPE' }), true);
  assert.equal(storedSeed(w)._userEdited, true);
  // Simula um bump de SEED_VERSION no código (a cópia fica numa versão antiga).
  const list = w.storage();
  list.find((b) => b.id === SEED.id)._seedVersion = 'v1.0';
  w.localStorage.setItem(BULLETINS_KEY, JSON.stringify(list));
  const pubs = w.AUTH.getBulletins({ status: 'published' });
  assert.equal(storedSeed(w).title, 'EDITADO PELA EQUIPE', 'edição humana sobrevive a bump de versão');
  assert.equal(pubs[0].title, 'EDITADO PELA EQUIPE');
});

test('boletim criado pelo usuário (id próprio) → preservado junto do seed', () => {
  const mine = {
    id: 'blt_user_1', bulletinNumber: 'BT-2026-099', status: 'published',
    title: 'Boletim do painel', type: 'novidade',
    createdAt: Date.now(), updatedAt: Date.now(), _seedVersion: 'v1.0',
  };
  const w = boot([mine]);
  const pubs = w.AUTH.getBulletins({ status: 'published' });
  assert.equal(pubs.length, 2);
  assert.ok(pubs.some((b) => b.id === 'blt_user_1'));
  assert.ok(pubs.some((b) => b.id === SEED.id));
});

test('filtro de status: seed published não aparece em archived', () => {
  const w = boot(null);
  assert.equal(w.AUTH.getBulletins({ status: 'published' }).length, 1);
  assert.equal(w.AUTH.getBulletins({ status: 'archived' }).length, 0);
});

/* ─────────────────────────── renderBulletinsDynamic ───────────────────── */

test('render: com publicados → cards reais, sem empty-state nem conteúdo fictício', () => {
  const w = boot(null);
  w.__render();
  const cards = w.document.querySelectorAll('#bltGrid .blt-card');
  assert.equal(cards.length, 1);
  assert.equal(w.document.getElementById('bltCountAll').textContent, '1');
  assert.doesNotMatch(w.document.getElementById('bltGrid').innerHTML, /empty-state/);
  assert.equal(
    w.document.querySelector('#bltGrid .blt-card-title').textContent, SEED.title
  );
  assert.ok(w.document.querySelector('#bltGrid .blt-card').dataset.bltId, 'card tem data-blt-id');
});

test('render: sem publicados → empty-state explícito, zero cards', () => {
  const w = boot(null);
  w.AUTH.getBulletins = () => [];
  w.__render();
  assert.equal(w.document.querySelectorAll('#bltGrid .blt-card').length, 0);
  assert.match(w.document.getElementById('bltGrid').innerHTML, /empty-state/);
  assert.equal(w.document.getElementById('bltCountAll').textContent, '0');
});

test('render: ordem por updatedAt decrescente', () => {
  const older = { id: 'blt_old', status: 'published', title: 'Antigo', type: 'novidade',
    createdAt: 1000, updatedAt: 1000 };
  const newer = { id: 'blt_new', status: 'published', title: 'Novo', type: 'alerta',
    createdAt: 9000, updatedAt: 9000 };
  const w = boot([older, newer]);
  const pubs = w.AUTH.getBulletins({ status: 'published' });
  const iNew = pubs.findIndex((b) => b.id === 'blt_new');
  const iOld = pubs.findIndex((b) => b.id === 'blt_old');
  assert.ok(iNew !== -1 && iOld !== -1, 'ambos presentes');
  assert.ok(iNew < iOld, 'mais recente vem primeiro');
});

/* ─────────── Regressão: footgun do _isStaleSeed (bug.md) ─────────── */

test('footgun corrigido: seed com texto novo E updatedAt novo + versão antiga → renovado', () => {
  // Antes: um `updatedAt` divergente era confundido com edição humana e a
  // cópia velha ficava presa para sempre (sintoma "versão antiga do boletim").
  // Agora a renovação depende só da `_seedVersion` (ou da flag `_userEdited`),
  // então editar o seed no código exige apenas bumpar SEED_VERSION.
  const stale = { ...SEED, title: 'TEXTO ANTIGO', updatedAt: SEED.updatedAt - 1, _seedVersion: 'v1.0' };
  const w = boot([stale]);
  w.AUTH.getBulletins({ status: 'published' });
  const stored = storedSeed(w);
  assert.equal(stored.title, SEED.title, 'texto velho deve ser renovado');
  assert.equal(stored._seedVersion, SEED_VERSION);
});
